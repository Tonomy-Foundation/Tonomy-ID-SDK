/**
 * An interface for objects that can be serialized to JSON.
 */
interface Serializable {
    /**
     * Returns the a JSON representation of the object
     *
     * @returns {string} the JSON string
     */
    toJSON(): string;
}
