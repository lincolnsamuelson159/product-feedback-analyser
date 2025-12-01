#!/bin/bash
# Sets up git to push to both GitLab and GitHub simultaneously

git remote set-url --add --push origin git@gitlab.com:boardiq/product-and-prototypes/product-feedback-analyser.git
git remote set-url --add --push origin https://github.com/lincolnsamuelson159/product-feedback-analyser.git

echo "✅ Configured. 'git push' now pushes to both:"
git remote -v | grep push
