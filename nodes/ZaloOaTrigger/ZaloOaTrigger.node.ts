import { createHmac, createHash } from 'crypto';
import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

// ─────────────────────────────────────────────────────────────────────────────
// Zalo OA Webhook Trigger
// Tài liệu sự kiện "user gửi tin nhắn":
//   https://developers.zalo.me/docs/official-account/webhook/tin-nhan/su-kien-nguoi-dung-gui-tin-nhan
// Các event_name liên quan: user_send_text, user_send_image, user_send_link,
// user_send_audio, user_send_video, user_send_sticker, user_send_location,
// user_send_file, user_send_gif, user_send_business_card, user_send_contact.
// ─────────────────────────────────────────────────────────────────────────────

interface ZaloWebhookBody extends IDataObject {
	app_id?: string;
	sender?: { id?: string } & IDataObject;
	recipient?: { id?: string } & IDataObject;
	event_name?: string;
	message?: IDataObject;
	timestamp?: string | number;
	user_id_by_app?: string;
}

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

// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool -- Trigger node không được dùng làm AI tool (sẽ render sai thành sub-node tròn, mất cổng Main)
export class ZaloOaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zalo OA Trigger',
		name: 'zaloOaTrigger',
		icon: 'file:../ZaloOa/zaloOa.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{"Zalo OA Webhook"}}',
		description:
			'Nhận webhook từ Zalo Official Account (sự kiện người dùng gửi tin nhắn, quan tâm OA, ...)',
		defaults: {
			name: 'Zalo OA Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'zaloOaApi',
				required: false,
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
				displayName:
					'Trigger webhook Zalo OA → dùng làm điểm khởi động workflow chatbot. Output có sẵn <code>user_id</code>, <code>text</code>, <code>msg_id</code> ở top-level để AI / LLM node xử lý, rồi chuyển tới node Zalo OA resource "Tin Tư Vấn (CS Message)" → operation "Gửi Tin Tư Vấn Dạng Văn Bản" để phản hồi (<code>csUserId = {{$json.user_id}}</code>, <code>csText = {{AI output}}</code>). Cấu hình URL này trong OA → Cài đặt Webhook. Tài liệu: <a href="https://developers.zalo.me/docs/official-account/webhook/tin-nhan/su-kien-nguoi-dung-gui-tin-nhan" target="_blank">Sự kiện người dùng gửi tin nhắn</a>.',
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
				description:
					'Chỉ trigger khi event_name khớp. Chọn rỗng để nhận tất cả sự kiện.',
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
				description:
					'Whether to verify X-ZEvent-Signature bằng secret_key của OA (credential Zalo OA API). Khuyến nghị bật ở production.',
			},
			{
				displayName: 'Trả Dữ Liệu Dạng Rút Gọn',
				name: 'simplify',
				type: 'boolean',
				default: true,
				description:
					'Whether to return a simplified payload (event_name, sender_id, recipient_id, message, timestamp) cùng raw body. Tắt để chỉ trả body nguyên gốc.',
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const body = (this.getBodyData() ?? {}) as ZaloWebhookBody;
		const headers = this.getHeaderData() as IDataObject;

		const events = this.getNodeParameter('events', []) as string[];
		const ignoreOaEcho = this.getNodeParameter('ignoreOaEcho', false) as boolean;
		const verifySignature = this.getNodeParameter('verifySignature', false) as boolean;
		const simplify = this.getNodeParameter('simplify', true) as boolean;

		const eventName = (body.event_name ?? '') as string;

		// ── Verify signature ───────────────────────────────────────────────────
		if (verifySignature) {
			let creds: IDataObject | undefined;
			try {
				creds = (await this.getCredentials('zaloOaApi')) as IDataObject;
			} catch {
				creds = undefined;
			}
			const secretKey = (creds?.secretKey as string) || '';

			const signatureHeader =
				(headers['x-zevent-signature'] as string) ||
				(headers['X-ZEvent-Signature'] as string) ||
				'';

			const rawBody =
				((req as unknown as { rawBody?: Buffer | string }).rawBody as Buffer | string | undefined) ??
				JSON.stringify(body);
			const rawBodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');
			const timestamp = String(body.timestamp ?? '');

			if (!secretKey || !signatureHeader) {
				return {
					webhookResponse: { status: 'invalid_signature' },
					noWebhookResponse: false,
				};
			}

			// Zalo: mac = SHA256(data + timestamp + oa_secret_key)
			const expectedSha256 = createHash('sha256')
				.update(rawBodyStr + timestamp + secretKey)
				.digest('hex');

			// Một số webhook cũ còn dùng HMAC-SHA256(body, secret)
			const expectedHmac = createHmac('sha256', secretKey)
				.update(rawBodyStr)
				.digest('hex');

			const providedSig = signatureHeader.replace(/^mac=/i, '').trim().toLowerCase();

			if (
				providedSig !== expectedSha256.toLowerCase() &&
				providedSig !== expectedHmac.toLowerCase()
			) {
				return {
					webhookResponse: { status: 'invalid_signature' },
					noWebhookResponse: false,
				};
			}
		}

		// ── Lọc event ──────────────────────────────────────────────────────────
		if (events.length > 0) {
			const expanded = new Set<string>();
			for (const ev of events) {
				if (ev === '__all_user_send__') {
					for (const e of ALL_USER_SEND_EVENTS) expanded.add(e);
				} else {
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

		// ── Bỏ qua echo từ OA ─────────────────────────────────────────────────
		if (ignoreOaEcho) {
			const senderId = body.sender?.id;
			const recipientId = body.recipient?.id;
			if (eventName.startsWith('oa_send_') || (senderId && senderId === recipientId)) {
				return {
					webhookResponse: { status: 'ignored_echo', event_name: eventName },
					noWebhookResponse: false,
				};
			}
		}

		// ── Build output ───────────────────────────────────────────────────────
		const msg = (body.message ?? {}) as IDataObject;
		const attachments = (msg.attachments as IDataObject[]) ?? [];
		const msgText = (msg.text as string) ?? '';
		const msgId = (msg.msg_id as string) ?? '';

		// user_id để reply qua API Tin Tư Vấn (/v3.0/oa/message/cs):
		// với event user_send_* thì sender.id chính là Zalo user_id của khách.
		const senderId = (body.sender?.id as string) ?? '';
		const recipientId = (body.recipient?.id as string) ?? '';
		const replyUserId = eventName.startsWith('oa_send_') ? recipientId : senderId;

		const output: IDataObject = simplify
			? {
					event_name: eventName,
					app_id: body.app_id ?? '',
					sender_id: senderId,
					recipient_id: recipientId,
					user_id_by_app: body.user_id_by_app ?? '',
					timestamp: body.timestamp ?? '',
					// Các field tiện cho AI agent / chatbot:
					user_id: replyUserId, // dùng trực tiếp làm csUserId khi reply
					text: msgText, // nội dung chữ user gửi (nếu có)
					msg_id: msgId,
					attachments,
					message: msg,
					raw: body,
				}
			: (body as IDataObject);

		return {
			workflowData: [this.helpers.returnJsonArray([output])],
			webhookResponse: { status: 'ok' },
		};
	}
}
