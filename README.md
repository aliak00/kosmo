nova
====

AWS infrastructure deployment tool. Uses cloudformation currently to deploy stacks along with artifacts.

Nova consists of 3 parts

- NovaForm: base building blocks of aws cloudformation stacks.
- NovaSTL: standard template library for common aws resource groups.
- NovaLib: Library of utitliy objects that Nova provides to make deployment easier

To use nova you have to create a nova definition file and then pass that to the nova binary, which will do the rest for you.

## Setting up nova

Run:
```bash
nova --profile <aws-cli-profile> init
```

This will bind a nova s3 bucket to your `aws-cli-profile`. And you may then start deploying to that aws account.

The nova bucket is used to keep track of various meta information related to artifacts and cloudformation templates
and also to store the actual data.

After initializing nova you will want to create a nova definition file:

## Nova definition file

A nova definition file has the following format:

```javascript
module.exports = function(nova) {
    return {
        name: 'project-name',
        artifacts: [],
        components: [],
    };
};
```

That of course does nothing. For Nova to do something you can add an artifact:

```javascript
module.exports = function(nova) {
    var artifact = {
        name: 'my-artifact',
        region: 'eu-west-1',
        build: function() {
            return nova.lib.createEbArtifact(...)
        },
    };

    return {
        name: 'project-name',
        artifacts: [artifact],
        components: [],
    };
};
```

Each artifact describes which region this artifact belongs to. This can be important for EB apps for eg. And implements a build function that returns a nova artifact object. You can obtain this in various ways, for eg with the nova lib. But now you need a place to put that artifact, so you can add a component to your project:

```javascript
module.exports = function(nova) {
    var artifact = {
        name: 'my-artifact',
        build: function() {
            return nova.lib.createEbArtifact(...)
        },
    };

    var component = {
        name: 'my-component'
        build: function() {
            return nova.lib.findArtifact('my-artifact').then(artifact => {
                var eb = nova.stl.EBApp(artifact, ...);
                return {
                    resources: [
                        eb,
                    ],
                };
            });
        },
    };

    return {
        name: 'project-name',
        artifacts: [artifact],
        components: [component],
    };
};
```
A component also describes a region that the component must be in, and implements a build function. In this build function we first find the artifact that we (should have) built earlier, and then we use nova stl to create an EB application and pass in the artifact. Every nova component must return a object that has an array of resources. Resources can be either created via nova stl or nova form.

## Building the artifact

To build the artifact you specify your profile that you initialized earlier and then the artifact:

```bash
nova --profile <aws-cli-profile> build project-name/my-artifact
```

This will run your build command, and if nova gets an artifact back, it will upload it to your accout in the necessary place.

## Deploying the component

```bash
nova --profile <aws-cli-profile> deploy project-name/my-component
```

And if all went well, you should have a cloudformation stack with an artifact running in your account.
