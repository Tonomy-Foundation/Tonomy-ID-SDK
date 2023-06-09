import { execSync } from 'child_process';

export default async function customSemanticReleaseScript(pluginConfig, context) {
    const { branch } = context;
    const tagPrefix = 'v';
    const tagSuffix = '-devtest1';

    // Generate the tag name based on the branch name and desired convention
    const tagName = `${tagPrefix}${branch.replace('/', '-')}${tagSuffix}`;

    // Add the tag
    execSync(`git tag ${tagName}`);

    // Push the tag
    execSync(`git push origin ${tagName}`);
}
