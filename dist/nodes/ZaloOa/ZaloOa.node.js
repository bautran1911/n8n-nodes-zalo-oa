"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloOa = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const ZALO_ZBS_API_BASE = 'https://business.openapi.zalo.me';
const ZALO_TOKEN_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';
async function refreshAccessToken(ctx, creds) {
    const body = new URLSearchParams();
    body.append('app_id', creds.appId);
    body.append('refresh_token', creds.refreshToken);
    body.append('grant_type', 'refresh_token');
    const options = {
        method: 'POST',
        url: ZALO_TOKEN_URL,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            secret_key: creds.secretKey,
        },
        body,
        json: true,
    };
    const response = (await ctx.helpers.httpRequest(options));
    if (!response.access_token) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), `Zalo refresh token thất bại: ${JSON.stringify(response)}`);
    }
    return response;
}
async function writeTokensToCredential(ctx, creds, newAccessToken, newRefreshToken) {
    var _a;
    const { n8nInstanceUrl, n8nApiKey, credentialId } = creds;
    if (!n8nInstanceUrl || !n8nApiKey || !credentialId) {
        return;
    }
    const baseUrl = n8nInstanceUrl.replace(/\/$/, '');
    try {
        const dataPayload = {
            credentialName: creds.credentialName,
            appId: creds.appId,
            secretKey: creds.secretKey,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            n8nInstanceUrl: n8nInstanceUrl !== null && n8nInstanceUrl !== void 0 ? n8nInstanceUrl : '',
            n8nApiKey: n8nApiKey !== null && n8nApiKey !== void 0 ? n8nApiKey : '',
            credentialId: credentialId !== null && credentialId !== void 0 ? credentialId : '',
            allowedHttpRequestDomains: (_a = creds.allowedHttpRequestDomains) !== null && _a !== void 0 ? _a : 'all',
        };
        if (creds.allowedHttpRequestDomains === 'domains' && creds.allowedDomains) {
            dataPayload.allowedDomains = creds.allowedDomains;
        }
        const options = {
            method: 'PATCH',
            url: `${baseUrl}/api/v1/credentials/${credentialId}`,
            headers: {
                'X-N8N-API-KEY': n8nApiKey,
                'Content-Type': 'application/json',
            },
            body: {
                name: creds.credentialName,
                type: 'zaloOaApi',
                data: dataPayload,
            },
            json: true,
        };
        await ctx.helpers.httpRequest(options);
    }
    catch (err) {
        ctx.logger.warn(`[ZaloOa] Không thể cập nhật credential: ${err.message}`);
    }
}
async function callZaloZbsApi(ctx, endpoint, body, creds, retried = false) {
    const options = {
        method: 'POST',
        url: `${ZALO_ZBS_API_BASE}${endpoint}`,
        headers: {
            access_token: creds.accessToken,
            'Content-Type': 'application/json',
        },
        body,
        json: true,
    };
    let response;
    try {
        response = (await ctx.helpers.httpRequest(options));
    }
    catch (err) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), err);
    }
    const errorCode = response.error;
    const isTokenExpired = !retried &&
        (errorCode === -124 ||
            errorCode === 3 ||
            errorCode === '-124' ||
            errorCode === '3');
    if (isTokenExpired) {
        const newTokens = await refreshAccessToken(ctx, creds);
        const newAccessToken = newTokens.access_token;
        const newRefreshToken = newTokens.refresh_token;
        creds.accessToken = newAccessToken;
        creds.refreshToken = newRefreshToken;
        await writeTokensToCredential(ctx, creds, newAccessToken, newRefreshToken);
        return await callZaloZbsApi(ctx, endpoint, body, creds, true);
    }
    return response;
}
class ZaloOa {
    constructor() {
        this.description = {
            displayName: 'Zalo OA',
            name: 'zaloOa',
            icon: 'file:zaloOa.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["resource"] === "token" ? "Refresh Token" : "Gửi ZBS Template"}}',
            description: 'Gửi tin ZBS Template Message qua SĐT và quản lý token (Zalo Business Solution)',
            defaults: {
                name: 'Zalo OA',
            },
            usableAsTool: true,
            inputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [{ name: 'zaloOaApi', required: true }],
            properties: [
                {
                    displayName: 'Resource',
                    name: 'resource',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Tin Nhắn ZBS Template',
                            value: 'message',
                            description: 'Gửi tin nhắn ZBS Template qua số điện thoại',
                        },
                        {
                            name: 'Token',
                            value: 'token',
                            description: 'Làm mới Access Token và ghi đè vào credential định kỳ',
                        },
                    ],
                    default: 'message',
                },
                {
                    displayName: 'Operation',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    displayOptions: { show: { resource: ['token'] } },
                    options: [
                        {
                            name: 'Refresh Token',
                            value: 'refresh',
                            description: 'Làm mới Access Token bằng Refresh Token và tự động ghi đè vào credential',
                            action: 'Refresh and save access token',
                        },
                    ],
                    default: 'refresh',
                },
                {
                    displayName: 'Số ĐIện Thoại Người Nhận',
                    name: 'phone',
                    type: 'string',
                    required: true,
                    default: '',
                    placeholder: '84987654321',
                    description: 'Số điện thoại người nhận định dạng quốc tế (ví dụ: 84987654321 hoặc +84987654321)',
                    displayOptions: { show: { resource: ['message'] } },
                },
                {
                    displayName: 'Template ID',
                    name: 'templateId',
                    type: 'string',
                    required: true,
                    default: '',
                    description: 'ID của mẫu tin nhắn (template) đã được đăng ký và phê duyệt trên Zalo',
                    displayOptions: { show: { resource: ['message'] } },
                },
                {
                    displayName: 'Dữ Liệu Template (JSON)',
                    name: 'templateData',
                    type: 'json',
                    required: true,
                    default: '{}',
                    description: 'Object JSON chứa các biến tương ứng với template. Ví dụ: {"customer":"Nguyễn Văn A","amount":"100.000"}.',
                    typeOptions: { rows: 5 },
                    displayOptions: { show: { resource: ['message'] } },
                },
                {
                    displayName: 'Tracking ID (Tuỳ Chọn)',
                    name: 'trackingId',
                    type: 'string',
                    default: '',
                    description: 'Mã theo dõi tuỳ chỉnh cho yêu cầu này (tối đa 48 ký tự)',
                    displayOptions: { show: { resource: ['message'] } },
                },
                {
                    displayName: 'Chế Độ Gửi',
                    name: 'sendingMode',
                    type: 'options',
                    default: '1',
                    description: 'Chế độ gửi tin nhắn',
                    options: [
                        {
                            name: 'Gửi Thường (Trong Hạn Mức)',
                            value: '1',
                            description: 'Gửi tin trong hạn mức cho phép (mặc định)',
                        },
                        {
                            name: 'Gửi Vượt Hạn Mức',
                            value: '3',
                            description: 'Gửi vượt hạn mức (cần được whitelist bởi Zalo)',
                        },
                    ],
                    displayOptions: { show: { resource: ['message'] } },
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const rawCreds = await this.getCredentials('zaloOaApi');
        const creds = {
            credentialName: rawCreds.credentialName,
            appId: rawCreds.appId,
            secretKey: rawCreds.secretKey,
            accessToken: rawCreds.accessToken,
            refreshToken: rawCreds.refreshToken,
            n8nInstanceUrl: rawCreds.n8nInstanceUrl || '',
            n8nApiKey: rawCreds.n8nApiKey || '',
            credentialId: rawCreds.credentialId || '',
            allowedHttpRequestDomains: (rawCreds.allowedHttpRequestDomains || 'all'),
            allowedDomains: rawCreds.allowedDomains || '',
        };
        for (let i = 0; i < items.length; i++) {
            const resource = this.getNodeParameter('resource', i);
            let result = {};
            if (resource === 'token') {
                const newTokens = await refreshAccessToken(this, creds);
                const newAccessToken = newTokens.access_token;
                const newRefreshToken = newTokens.refresh_token;
                creds.accessToken = newAccessToken;
                creds.refreshToken = newRefreshToken;
                await writeTokensToCredential(this, creds, newAccessToken, newRefreshToken);
                result = {
                    success: true,
                    access_token: newAccessToken,
                    refresh_token: newRefreshToken,
                    credentialUpdated: !!(creds.n8nInstanceUrl && creds.n8nApiKey && creds.credentialId),
                    message: creds.credentialId
                        ? 'Token đã được làm mới và ghi đè vào credential thành công.'
                        : 'Token đã được làm mới. (Chưa có Credential ID → chưa ghi đè tự động)',
                };
            }
            else if (resource === 'message') {
                const phone = this.getNodeParameter('phone', i);
                const templateId = this.getNodeParameter('templateId', i);
                const templateDataRaw = this.getNodeParameter('templateData', i);
                const trackingId = this.getNodeParameter('trackingId', i);
                const sendingMode = this.getNodeParameter('sendingMode', i);
                let templateData;
                if (typeof templateDataRaw === 'string') {
                    try {
                        templateData = JSON.parse(templateDataRaw);
                    }
                    catch {
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Dữ liệu template không hợp lệ (không phải JSON hợp lệ): ${templateDataRaw}`, { itemIndex: i });
                    }
                }
                else {
                    templateData = templateDataRaw;
                }
                const requestBody = {
                    phone,
                    template_id: templateId,
                    template_data: templateData,
                    sending_mode: Number(sendingMode),
                };
                if (trackingId) {
                    requestBody.tracking_id = trackingId;
                }
                result = await callZaloZbsApi(this, '/message/template', requestBody, creds);
            }
            returnData.push({ json: result, pairedItem: { item: i } });
        }
        return [returnData];
    }
}
exports.ZaloOa = ZaloOa;
//# sourceMappingURL=ZaloOa.node.js.map