# Workspace Enhancements

## Data

Where do we store data?

I like this in the org directory:

```
/.envrc
/.deepstaging
/workspace
/repositories

```

Which means we need to move our repositories. Should be a simple `mv`.

Using `/.deepstaging` gives us flexibility in the future without messing up the org directory. This is good practice and ethics.

### Configuration

Setting env vars in .envrc is painful. Too much noise that distracts the developer from accomplishing what he wants.

I propose an additional file to be copied to the ORG_DIR. Something simple like `/.deepstaging/${‘ORG_DIR’ name}.settings.yaml`

### Prompts

We should provide a directory for users to write prompts. 

To git ignore or not? Maybe approved prompts are added to the repo?

## Conventions

All conventions should be defined in a user friendly format.

### What are our conventions?

**DISCOVER WHAT QUESTIONS YOU NEED!!**

## Scripts

We need a list of scripts that is easily discoverable by a developer browsing this repository. Each script should have a documentation file.

Need to keep documentation well organized. So a central documentation directory is a must.

Do we call it 'docs/'? Can we choose a better name? I sort of like ‘reference/‘! We can store our conventions there as well.


### Create-Repository

Disallow all other template packages. We only want Deepstaging.Templates to be selected,

Deepstaging.Templates should define ready to go repositories, so after installing a template, we should be able to 
`bootstrap` a repository to meet the Deepstaging conventions.

# Templates Enhancements

We need a list of templates that is easily discoverable by a developer browsing this repository.

**All templates must follow our deepstaging repository conventions**

## Empty Templates

- [ ] Empty Single Nuget Package Repository
- [ ] Empty Multi Nuget Package Repository

## Roslyn Templates

- [x] Deepstaging Roslyn Tool Repository
- [ ] Deepstaging Effects Module Repository


# Deepstaging.Testing Enhancements

After we complete the effects features, we can add a generator to be an auto mocking runtime with a super convenient API. We want to promote testing and providing the base to run tests is a game changer!




# DEEPSTAGING ORG WORKSPACE ONLY #

For the deepstaging org, I want to manage a global nuget version for all packages per repo.

I’d like a workspace script that could bump versions (major, minor only) globally.

I’d like a workspace script that can bump any repository’s nuget packages fix version.

Then the templates would get a script to run the workspace script with the repo path. Publish works similarly. I’d love it if they both shared the same conventions.

