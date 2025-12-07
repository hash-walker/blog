#!/bin/bash

filename=/home/hash-walker/github.com/hash-walker/bloggr/content/en/journal/logs/journel_$( date '+%Y-%m-%d' ).md

cat <<EOF> "$filename"
$( date '+%A, %B %d, %Y' ) 
	
# What did I work on today?
# What did I learn today?
# Any blockers?
EOF

