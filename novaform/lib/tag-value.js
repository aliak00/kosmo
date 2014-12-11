function TagValue(value, propagateAtLaunch) {
    if (!(this instanceof TagValue)) {
        return new TagValue(value, propagateAtLaunch)
    }

    if (typeof propagateAtLaunch !== 'undefined') {
        this.PropagateAtLaunch = propagateAtLaunch;
    }

    this.Value = value;
}

module.exports = TagValue;