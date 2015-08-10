module.exports = {
    Template: require('./lib/template'),

    Vpc: require('./lib/templates/vpc'),
    Nat: require('./lib/templates/nat'),
    Bastion: require('./lib/templates/bastion'),
    Rds: require('./lib/templates/rds'),
    EBApp: require('./lib/templates/ebapp'),
    EBWorker: require('./lib/templates/ebworker'),

    EBOptionSettings: require('./lib/utils/eb-option-settings'),
};
