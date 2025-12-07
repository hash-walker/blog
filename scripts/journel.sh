#!/bin/bash

filename=/home/hash-walker/github.com/hash-walker/bloggr/content/en/journal/logs/journal_$( date '+%Y-%m-%d' ).md

cat <<EOF> "$filename"
---
title: "journal 2025-12-06"
date: $( date '+%Y-%m-%dT%H:%M:%S%z' )
draft: true
---


$( date '+%A, %B %d, %Y' ) 

# What did I work on today?
# What did I learn today?
# Any blockers?
EOF

