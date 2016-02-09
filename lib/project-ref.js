
var ProjectRef = {
    parse: function(ref) {
        if (typeof ref !== 'string') {
            throw new Error('Project ref must be string');
        }
        var parts = ref.split('/');

        if (!parts.length || parts.length > 2) {
            throw new Error('Project reference invalid: ' + ref);
        }

        this.name = parts[0];

        if (parts.length === 2) {
            this.subname = parts[1];
        }

        return {
            name: parts[0],
            subname: parts[1],
        };
    },
};

module.exports = ProjectRef;
