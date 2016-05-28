var types = require('./types');

module.exports = {
    KeyValuePair: function(typeName, keyType, valueType) {
        keyType = keyType || types.string;
        valueType = valueType || types.string;
        if (typeof keyType.name !== 'string') {
            throw new Error('Key.name must be string');
        }
        if (typeof valueType.name !== 'string') {
            throw new Error('Value.name must be string');
        }
        return types.object(typeName, {
            Key: { type: keyType, required: true },
            Value: { type: valueType, required: true },
        });
    },

    // TODO: A lot of NameValuePairs as well...
};
