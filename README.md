nova
====

Secret CTO tool - also a cataclysmic nuclear explosion of a white dwarf.

This repository contains maybe 4 projects

- Novaform: base building blocks of aws cloudformation templates
- NovaSTL: standard template library for common aws resource groups
- NovaLib: (maybe) - helper functions that tie up the aws sdk with novaform
- Nova: The binary itself that takes a config file, some nova code and manages deployments

## Dev setup

Since this repo uses unpublished node modules, you have to do a little manual work to get it up and running to develop on
```bash
cd nova/novaform
sudo npm link
cd ../novastl
sudo npm link novaform
npm install
sudo npm link
cd ../examples
sudo npm link novastl
npm install
```
