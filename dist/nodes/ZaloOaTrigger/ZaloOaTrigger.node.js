"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZaloOaTrigger = void 0;
const crypto_1 = require("crypto");
const n8n_workflow_1 = require("n8n-workflow");
const ALL_USER_SEND_EVENTS = [
    'user_send_text',
    'user_send_image',
    'user_send_link',
    'user_send_audio',
    'user_send_video',
    'user_send_sticker',
    'user_send_location',
    'user_send_file',
    'user_send_gif',
    'user_send_business_card',
    'user_send_contact',
];
class ZaloOaTrigger {
    constructor() {
        this.description = {
            displayName: 'Zalo OA Trigger',
            name: 'zaloOaTrigger',
            icon: 'file:../ZaloOa/zaloOa.svg',
            group: ['trigger'],
            version: 1,
            subtitle: '={{"Zalo OA Webhook"}}',
            description: 'Nhận webhook từ Zalo Official Account (sự kiện người dùng gửi tin nhắn, quan tâm OA, ...)',
            defaults: {
                name: 'Zalo OA Trigger',
            },
            inputs: [],
            outputs: [n8n_workflow_1.NodeConnectionTypes.Main],
            credentials: [
                {
                    name: 'zaloOaApi',
                    required: false,
                    displayOptions: {
                        show: {
                            verifySignature: [true],
                        },
                    },
                },
            ],
            webhooks: [
                {
                    name: 'default',
                    httpMethod: 'POST',
                    responseMode: 'onReceived',
                    path: 'zalo-oa',
                },
            ],
            properties: [
                {
                    displayName: 'Cấu hình URL Webhook này trong Zalo Official Account → Cài đặt Webhook. Mặc định node chỉ phản hồi 200 OK để Zalo không gửi lại. Tài liệu: <a href="https://developers.zalo.me/docs/official-account/webhook/tin-nhan/su-kien-nguoi-dung-gui-tin-nhan" target="_blank">Sự kiện người dùng gửi tin nhắn</a>.',
                    name: 'webhookNotice',
                    type: 'notice',
                    default: '',
                },
                {
                    displayName: 'Sự Kiện Lắng Nghe',
                    name: 'events',
                    type: 'multiOptions',
                    required: true,
                    default: ['user_send_text'],
                    description: 'Chỉ trigger khi event_name khớp. Chọn rỗng để nhận tất cả sự kiện.',
                    options: [
                        { name: 'All User Send Events (Tất Cả Tin Người Dùng Gửi)', value: '__all_user_send__' },
                        { name: 'Follow (Người Dùng Quan Tâm OA)', value: 'follow' },
                        { name: 'OA Send Image (OA Gửi Hình)', value: 'oa_send_image' },
                        { name: 'OA Send Text (OA Gửi Chữ)', value: 'oa_send_text' },
                        { name: 'Unfollow (Thôi Quan Tâm OA)', value: 'unfollow' },
                        { name: 'User Click Chatnow (Bấm Chat Now)', value: 'user_click_chatnow' },
                        { name: 'User Received Message', value: 'user_received_message', description: 'Đã nhận tin' },
                        { name: 'User Seen Message', value: 'user_seen_message', description: 'Đã xem tin' },
                        { name: 'User Send Audio', value: 'user_send_audio', description: 'Gửi âm thanh' },
                        { name: 'User Send Business Card', value: 'user_send_business_card', description: 'Gửi danh thiếp' },
                        { name: 'User Send Contact', value: 'user_send_contact', description: 'Gửi liên hệ' },
                        { name: 'User Send File', value: 'user_send_file', description: 'Gửi tệp' },
                        { name: 'User Send GIF', value: 'user_send_gif', description: 'Gửi ảnh động' },
                        { name: 'User Send Image', value: 'user_send_image', description: 'Gửi hình ảnh' },
                        { name: 'User Send Link', value: 'user_send_link', description: 'Gửi đường liên kết' },
                        { name: 'User Send Location', value: 'user_send_location', description: 'Gửi vị trí' },
                        { name: 'User Send Sticker', value: 'user_send_sticker', description: 'Gửi sticker' },
                        { name: 'User Send Text', value: 'user_send_text', description: 'Gửi tin nhắn chữ' },
                        { name: 'User Send Video', value: 'user_send_video', description: 'Gửi video' },
                        { name: 'User Submit Info', value: 'user_submit_info', description: 'Gửi thông tin' },
                    ],
                },
                {
                    displayName: 'Chỉ Nhận Message Gốc (Bỏ Qua Echo OA)',
                    name: 'ignoreOaEcho',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to drop events where sender bằng recipient hoặc event_name bắt đầu với oa_send_. Bật để tránh loop khi node gửi tin làm OA tự phát event.',
                },
                {
                    displayName: 'Xác Thực Chữ Ký (Verify Signature)',
                    name: 'verifySignature',
                    type: 'boolean',
                    default: false,
                    description: 'Whether to verify X-ZEvent-Signature bằng secret_key của OA (credential Zalo OA API). Khuyến nghị bật ở production.',
                },
                {
                    displayName: 'Trả Dữ Liệu Dạng Rút Gọn',
                    name: 'simplify',
                    type: 'boolean',
                    default: true,
                    description: 'Whether to return a simplified payload (event_name, sender_id, recipient_id, message, timestamp) cùng raw body. Tắt để chỉ trả body nguyên gốc.',
                },
            ],
            usableAsTool: true,
        };
    }
    async webhook() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
        const req = this.getRequestObject();
        const body = ((_a = this.getBodyData()) !== null && _a !== void 0 ? _a : {});
        const headers = this.getHeaderData();
        const events = this.getNodeParameter('events', []);
        const ignoreOaEcho = this.getNodeParameter('ignoreOaEcho', false);
        const verifySignature = this.getNodeParameter('verifySignature', false);
        const simplify = this.getNodeParameter('simplify', true);
        const eventName = ((_b = body.event_name) !== null && _b !== void 0 ? _b : '');
        if (verifySignature) {
            let creds;
            try {
                creds = (await this.getCredentials('zaloOaApi'));
            }
            catch {
                creds = undefined;
            }
            const secretKey = (creds === null || creds === void 0 ? void 0 : creds.secretKey) || '';
            const signatureHeader = headers['x-zevent-signature'] ||
                headers['X-ZEvent-Signature'] ||
                '';
            const rawBody = (_c = req.rawBody) !== null && _c !== void 0 ? _c : JSON.stringify(body);
            const rawBodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
            const timestamp = String((_d = body.timestamp) !== null && _d !== void 0 ? _d : '');
            if (!secretKey || !signatureHeader) {
                return {
                    webhookResponse: { status: 'invalid_signature' },
                    noWebhookResponse: false,
                };
            }
            const expectedSha256 = (0, crypto_1.createHash)('sha256')
                .update(rawBodyStr + timestamp + secretKey)
                .digest('hex');
            const expectedHmac = (0, crypto_1.createHmac)('sha256', secretKey)
                .update(rawBodyStr)
                .digest('hex');
            const providedSig = signatureHeader.replace(/^mac=/i, '').trim().toLowerCase();
            if (providedSig !== expectedSha256.toLowerCase() &&
                providedSig !== expectedHmac.toLowerCase()) {
                return {
                    webhookResponse: { status: 'invalid_signature' },
                    noWebhookResponse: false,
                };
            }
        }
        if (events.length > 0) {
            const expanded = new Set();
            for (const ev of events) {
                if (ev === '__all_user_send__') {
                    for (const e of ALL_USER_SEND_EVENTS)
                        expanded.add(e);
                }
                else {
                    expanded.add(ev);
                }
            }
            if (!expanded.has(eventName)) {
                return {
                    webhookResponse: { status: 'ignored', event_name: eventName },
                    noWebhookResponse: false,
                };
            }
        }
        if (ignoreOaEcho) {
            const senderId = (_e = body.sender) === null || _e === void 0 ? void 0 : _e.id;
            const recipientId = (_f = body.recipient) === null || _f === void 0 ? void 0 : _f.id;
            if (eventName.startsWith('oa_send_') || (senderId && senderId === recipientId)) {
                return {
                    webhookResponse: { status: 'ignored_echo', event_name: eventName },
                    noWebhookResponse: false,
                };
            }
        }
        const output = simplify
            ? {
                event_name: eventName,
                app_id: (_g = body.app_id) !== null && _g !== void 0 ? _g : '',
                sender_id: (_j = (_h = body.sender) === null || _h === void 0 ? void 0 : _h.id) !== null && _j !== void 0 ? _j : '',
                recipient_id: (_l = (_k = body.recipient) === null || _k === void 0 ? void 0 : _k.id) !== null && _l !== void 0 ? _l : '',
                user_id_by_app: (_m = body.user_id_by_app) !== null && _m !== void 0 ? _m : '',
                timestamp: (_o = body.timestamp) !== null && _o !== void 0 ? _o : '',
                message: (_p = body.message) !== null && _p !== void 0 ? _p : {},
                raw: body,
            }
            : body;
        return {
            workflowData: [this.helpers.returnJsonArray([output])],
            webhookResponse: { status: 'ok' },
        };
    }
}
exports.ZaloOaTrigger = ZaloOaTrigger;
//# sourceMappingURL=ZaloOaTrigger.node.js.map