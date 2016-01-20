var util = require('util');

module.exports.endpointUrlForRegion = function(region) {
    if (!region) {
        return 'https://s3.amazonaws.com';
    }
    return util.format('https://s3-%s.amazonaws.com', region);
};

module.exports.urlForUploadParams = function(region, params) {
    var s3endpoint = this.endpointUrlForRegion(region);
    var url = util.format('%s/%s/%s', s3endpoint, params.Bucket, params.Key);
    return url;
};
