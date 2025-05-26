import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class CronlyticApi implements ICredentialType {
	name = 'cronlyticApi';
	displayName = 'Cronlytic API';
	documentationUrl = 'https://www.cronlytic.com/api-documentation';
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			default: '',
			required: true,
			typeOptions: {
				password: true,
			},
			description: 'Your Cronlytic API key',
		},
		{
			displayName: 'User ID',
			name: 'userId',
			type: 'string',
			default: '',
			required: true,
			description: 'Your Cronlytic User ID',
		},
	];

	// This allows the credential to be used by HTTP Request node or other generic calls
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
				'X-User-ID': '={{$credentials.userId}}',
				'Content-Type': 'application/json',
			},
		},
	};

	// Test connection using the /ping endpoint to warm lambda and verify credentials
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.cronlytic.com/prog',
			url: '/ping',
			method: 'GET',
			// /ping doesn't require authentication, but we'll use it to test connectivity
			// We'll implement proper credential testing in the node itself
		},
	};
}