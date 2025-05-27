import {
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
	INodeExecutionData,
	NodeConnectionType,
	IHookFunctions,
	IHttpRequestMethods,
	IRequestOptions,
	NodeOperationError,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';

export class CronlyticTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cronlytic Trigger',
		name: 'cronlyticTrigger',
		icon: 'fa:clock',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["cronExpression"]}}',
		description: 'Trigger workflows using Cronlytic advanced cron scheduling',
		defaults: {
			name: 'Cronlytic Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'cronlyticApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'lastNode',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Job Name',
				name: 'jobName',
				type: 'string',
				default: '',
				required: true,
				description: 'Unique name for the cron job (alphanumeric, hyphens, underscores only)',
				placeholder: 'my-workflow-trigger',
			},
			{
				displayName: 'Cron Expression',
				name: 'cronExpression',
				type: 'string',
				default: '0 9 * * *',
				required: true,
				description: '5-field cron expression (minute hour day month day-of-week)',
				placeholder: '*/5 * * * * (every 5 minutes)',
			},
			{
				displayName: 'Webhook Body',
				name: 'webhookBody',
				type: 'json',
				default: '{}',
				description: 'JSON data to send with webhook trigger (optional)',
			},
			{
				displayName: 'Additional Headers',
				name: 'webhookHeaders',
				type: 'fixedCollection',
				default: {},
				description: 'Additional headers for webhook requests',
				options: [
					{
						name: 'headers',
						displayName: 'Headers',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Header name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Header value',
							},
						],
					},
				],
				typeOptions: {
					multipleValues: true,
				},
			},
		],
	};

	// Helper method to warm lambda with exponential backoff
	private async warmLambda(context: IHookFunctions, credentials: ICredentialDataDecryptedObject): Promise<void> {
		const maxRetries = 3;
		const baseDelay = 1000; // 1 second

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const options: IRequestOptions = {
					method: 'GET',
					url: 'https://api.cronlytic.com/prog/ping',
					timeout: 5000,
				};

				const response = await context.helpers.request(options);

				if (response && typeof response === 'object' && (response as any).message === 'pong') {
					return; // Lambda warmed successfully
				}

				if (response && typeof response === 'string') {
					const parsed = JSON.parse(response);
					if (parsed.message === 'pong') {
						return;
					}
				}
			} catch (error) {
				if (attempt === maxRetries) {
					throw new NodeOperationError(context.getNode(), `Failed to warm lambda after ${maxRetries} attempts: ${error.message}`);
				}

				// Exponential backoff: 1s, 2s, 4s
				const delay = baseDelay * Math.pow(2, attempt - 1);
				await new Promise<void>(resolve => {
					// Use require to access setTimeout from Node.js
					const nodeSetTimeout = require('timers').setTimeout;
					nodeSetTimeout(() => resolve(), delay);
				});
			}
		}
	}

	// Helper method to make requests to Cronlytic API
	private async cronlyticRequest(
		context: IHookFunctions,
		method: IHttpRequestMethods,
		endpoint: string,
		credentials: ICredentialDataDecryptedObject,
		body?: any,
	): Promise<any> {
		const options: IRequestOptions = {
			method,
			url: `https://api.cronlytic.com/prog${endpoint}`,
			headers: {
				'X-API-Key': credentials.apiKey as string,
				'X-User-ID': credentials.userId as string,
				'Content-Type': 'application/json',
			},
			timeout: 10000,
		};

		if (body) {
			options.body = body;
			options.json = true;
		}

		try {
			const response = await context.helpers.request(options);
			return response;
		} catch (error) {
			if (error.response) {
				const errorMessage = error.response.body?.detail || error.response.body || error.message;
				throw new NodeOperationError(context.getNode(), `API Error: ${errorMessage}`);
			}
			throw error;
		}
	}

	// Methods for managing webhooks
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				try {
					const webhookData = this.getWorkflowStaticData('node');
					const jobId = webhookData.jobId as string;

					if (!jobId) {
						return false;
					}

					// Check if job exists on Cronlytic
					const credentials = await this.getCredentials('cronlyticApi');
					const triggerInstance = new CronlyticTrigger();
					await triggerInstance.warmLambda(this, credentials);

					const response = await triggerInstance.cronlyticRequest(this, 'GET', `/jobs/${jobId}`, credentials);
					return response !== null;
				} catch (error) {
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				try {
					const webhookUrl = this.getNodeWebhookUrl('default');
					const jobName = this.getNodeParameter('jobName') as string;
					const cronExpression = this.getNodeParameter('cronExpression') as string;
					const webhookBody = this.getNodeParameter('webhookBody', '{}') as string;
					const webhookHeaders = this.getNodeParameter('webhookHeaders') as any;

					// Build headers object
					const headers: { [key: string]: string } = {
						'Content-Type': 'application/json',
						'User-Agent': 'n8n-cronlytic-trigger',
					};

					// Add custom headers
					if (webhookHeaders?.headers) {
						for (const header of webhookHeaders.headers) {
							if (header.name && header.value) {
								headers[header.name] = header.value;
							}
						}
					}

					const credentials = await this.getCredentials('cronlyticApi');
					const triggerInstance = new CronlyticTrigger();
					await triggerInstance.warmLambda(this, credentials);

					// Create job on Cronlytic
					const jobData = {
						name: jobName,
						url: webhookUrl,
						method: 'POST',
						headers,
						body: webhookBody || '{}',
						cron_expression: cronExpression,
					};

					const response = await triggerInstance.cronlyticRequest(this, 'POST', '/jobs', credentials, jobData);

					if (response?.job_id) {
						// Store job ID for later reference
						const webhookData = this.getWorkflowStaticData('node');
						webhookData.jobId = response.job_id;
						return true;
					}

					return false;
				} catch (error) {
					throw new NodeOperationError(this.getNode(), `Failed to create Cronlytic job: ${error.message}`);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				try {
					const webhookData = this.getWorkflowStaticData('node');
					const jobId = webhookData.jobId as string;

					if (!jobId) {
						return true; // Nothing to delete
					}

					const credentials = await this.getCredentials('cronlyticApi');
					const triggerInstance = new CronlyticTrigger();
					await triggerInstance.warmLambda(this, credentials);

					await triggerInstance.cronlyticRequest(this, 'DELETE', `/jobs/${jobId}`, credentials);

					// Clear stored job ID
					delete webhookData.jobId;
					return true;
				} catch (error) {
					// If job doesn't exist, consider it successfully deleted
					if (error.message.includes('404') || error.message.includes('not found')) {
						const webhookData = this.getWorkflowStaticData('node');
						delete webhookData.jobId;
						return true;
					}
					throw new NodeOperationError(this.getNode(), `Failed to delete Cronlytic job: ${error.message}`);
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const headers = this.getHeaderData();
		const query = this.getQueryData();

		// Create output data for the workflow
		const outputData: INodeExecutionData[] = [
			{
				json: {
					headers,
					params: query,
					body: bodyData,
					timestamp: new Date().toISOString(),
					source: 'cronlytic',
					cronlytic_trigger: true,
				},
			},
		];

		// Return response that keeps the trigger active
		return {
			workflowData: [outputData],
		};
	}
}