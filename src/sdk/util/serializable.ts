/**
 * An interface for objects that can be serialized to JSON.
 */
export interface Serializable {
    /**
     * Constructs a new object from a JSON string. This must be implemented by the derived class.
     * It is commented out here to prevent the compiler from complaining.
     */
    // constructor(arg: string) {}

    /**
     * Returns the a JSON string representation of the object
     *
     * @returns {string} the JSON string
     */
    toJSON(): string;
}
