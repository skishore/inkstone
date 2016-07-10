// Schema: lists is a simple key-value store mapping list names to a boolean
// that determines whether they are enabled.
import {PersistentDict} from '/client/model/persistence';

const Lists = new PersistentDict('lists');

export {Lists};
