/**
 * The default home of CloudCamp in a project.
 */
export const CAMP_HOME_DIR = "cloudcamp";

/**
 * AWS tag - CloudCamp app name
 */
export const TAG_APP_NAME = "cloudcamp:app-name";

/**
 * CDK context key - CloudCamp home. Only passed via command line.
 */
export const CONTEXT_KEY_HOME = "@cloudcamp/home";

/**
 * CDK context key - CloudCamp app name
 */
export const CONTEXT_KEY_NAME = "@cloudcamp/name";

/**
 * CDK context key - source code repository
 */
export const CONTEXT_KEY_REPOSITORY = "@cloudcamp/repository";

/**
 * CDK context key - source code branch
 */
export const CONTEXT_KEY_BRANCH = "@cloudcamp/branch";

/**
 * CDK context key - AWS region
 */
export const CONTEXT_KEY_REGION = "@cloudcamp/region";

/**
 * CDK context key - AWS account number
 */
export const CONTEXT_KEY_ACCOUNT = "@cloudcamp/account";

/**
 * CDK context key - AWS VPC ID
 */
export const CONTEXT_KEY_VPC = "@cloudcamp/vpc";

/**
 * CDK context key - AWS secret name for repository token
 */
export const CONTEXT_REPOSITORY_TOKEN_SECRET =
  "@cloudcamp/repository-token-secret";

/**
 * CDK context key - CloudCamp version
 */
export const CONTEXT_KEY_CLOUDCAMP_VERSION = "@cloudcamp/cloudcamp-version";

/**
 * CDK context key - cloud service provider
 */
export const CONTEXT_KEY_PROVIDER = "@cloudcamp/provider";

export enum CloudCampProvider {
  AwsCdk = "aws-cdk",
}
