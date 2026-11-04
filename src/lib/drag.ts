/** MIME type used for dragging a sound card into the Word Builder. */
export const CARD_DRAG_TYPE = 'application/x-sound-id'

/**
 * Id of the card being dragged right now (null otherwise). `dragover` cannot read the DataTransfer payload, so the
 * Word Builder looks here to preview the figure in the block under the pointer.
 */
export const cardDrag: { id: string | null } = { id: null }
