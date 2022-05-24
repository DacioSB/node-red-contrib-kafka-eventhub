#!/bin/bash
src=$(pwd)"/src"
dist=$(pwd)"/dist"
for entry in $(ls src); do
    # copy folder icons if exists
    # if you want to do it for other folder that you standardized,
    # then use some like this code below
    if [ -d "$src/$entry/icons" ]; then
        cp -r "$src/$entry/icons" "$dist/$entry"
    fi
    # copy files from the root of the node in src to dist
    # not recursively
    # if you want to add other extensions, do some like this: (html|xml|json|jpeg)
    for file in $(ls $src/$entry); do
        if [[ $file =~ .*\.(html) ]]; then
            cp $src/$entry/$file $dist/$entry/$file
        fi
    done
done