import type { ICredentialDataDecryptedObject, ICredentialTestRequest, ICredentialType, IHttpRequestOptions, INodeProperties } from 'n8n-workflow';
export declare class ZaloOaApi implements ICredentialType {
    name: string;
    displayName: string;
    icon: "file:zaloOa.svg";
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: (credentials: ICredentialDataDecryptedObject, requestOptions: IHttpRequestOptions) => Promise<IHttpRequestOptions>;
    test: ICredentialTestRequest;
}
