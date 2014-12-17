nova
====

Secret CTO tool - also a cataclysmic nuclear explosion of a white dwarf.

This repository contains maybe 3 projects

- Novaform: base building blocks of aws cloudformation stacks
- NovaSTL: standard template library for common aws resource groups
- Nova: The binary itself that takes a config file, some nova code and manages deployments

## Dev setup

Since this repo uses unpublished node modules, you have to do a little manual work to get it up and running to develop on

```bash
cd <nova-repo>/novaform
sudo npm link

cd <nova-repo>/novastl
sudo npm link novaform
npm install
sudo npm link

cd <nova-repo>/nova
sudo npm link novaform
npm install
sudo npm link
```

## Examples

To run examples with a dev setup
```bash
cd ../examples
sudo npm link novastl
sudo npm link novaform
npm install
node <example-file>.js
```
