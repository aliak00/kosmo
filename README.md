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
npm link

cd <nova-repo>/novastl
npm link novaform
npm install
npm link

cd <nova-repo>/nova
npm link novaform
npm link novastl
npm install
npm link
```

## Examples

To run examples templates with a dev setup. These examples outout a cloudformation stack
```bash
cd ../examples/cf-templates
npm link novastl
npm link novaform
npm install
node <example-file>.js
```

## Running nova

You can run the following in the examples/nova-projects directory to deploy an example stack
```bash
nova --profile <aws-cli-profile> deploy project1/stack1
```
