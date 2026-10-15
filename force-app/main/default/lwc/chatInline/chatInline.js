import { LightningElement, api } from 'lwc';

/**
 * Renders a flat list of inline segments produced by c/messageParser.
 * Every value goes through LWC text nodes / attributes; there is no innerHTML.
 */
export default class ChatInline extends LightningElement {
    @api segments = [];
}