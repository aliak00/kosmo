NOTE: This branch is deprecated. Rework-nova is the branch that is being actively worked on.

nova
====

AWS infrastructure deployment tool

Nova consists of 3 parts

- Novaform: base building blocks of aws cloudformation stacks
- NovaSTL: standard template library for common aws resource groups
- Nova: The binary that is used to build artifacts and deploy intrastructure components

## Setting up nova

Nova will associate a bucket in your aws account with your profile. To set it up, run:
```bash
nova --profile <aws-cli-profile> init
```

## Running nova

You can run the following in the examples/nova-projects directory to deploy an example stack
```bash
nova --profile <aws-cli-profile> deploy project1/stack1
```
