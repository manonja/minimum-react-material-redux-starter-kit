| Branch | Build status |
|--------|--------------|
| Master | [![CircleCI](https://circleci.com/gh/manonja/minimum-react-material-redux-starter-kit.svg?style=svg)](https://circleci.com/gh/manonja/minimum-react-material-redux-starter-kit) |
 
# minimum-react-material-redux-starter-kit
A batteries included web starter kit with react, redux and material UI for an easy project setup.


## AWS setup
```
aws s3api create-bucket \
--bucket minimum-react-material-redux-starter-kit \
--region eu-west-2 \
 --create-bucket-configuration LocationConstraint=eu-west-2

aws s3 website s3://minimum-react-material-redux-starter-kit --index-document index.html.gz --error-document error.html

aws s3api put-object-acl --bucket minimum-react-material-redux-starter-kit --key index.html.gz --acl public-read
```