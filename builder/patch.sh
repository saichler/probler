#!/usr/bin/env bash
set -e
find . -name "plugin.go" -type f -exec sed -i 's/md\.bad = true/\/\/md.bad = true/g' {} +
find . -name "plugin.go" -type f -exec sed -i 's/return "", nil, nil, "plugin was built with a different version of package " + pkghash\.modulename/\/\/return "", nil, nil, "plugin was built with a different version of package " + pkghash.modulename/g' {} +