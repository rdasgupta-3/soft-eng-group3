"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfiguration = loadConfiguration;
const locate_file_1 = require("../configuration/locate_file");
const configuration_1 = require("../configuration");
const environment_1 = require("../environment");
const convert_configuration_1 = require("./convert_configuration");
/**
 * Load user-authored configuration to be used in a test run
 *
 * @public
 * @param options - Coordinates required to find configuration
 * @param environment - Project environment
 */
async function loadConfiguration(options = {}, environment = {}) {
    const { cwd, env, logger } = (0, environment_1.makeEnvironment)(environment);
    const configFile = options.file ?? (0, locate_file_1.locateFile)(cwd);
    if (configFile) {
        logger.debug(`Configuration will be loaded from "${configFile}"`);
    }
    else if (configFile === false) {
        logger.debug('Skipping configuration file resolution');
    }
    else {
        logger.debug('No configuration file found');
    }
    const profileConfiguration = configFile
        ? await (0, configuration_1.fromFile)(logger, cwd, configFile, options.profiles)
        : {};
    const providedConfiguration = (0, configuration_1.parseConfiguration)(logger, 'Provided', options.provided);
    if (profileConfiguration.paths?.length > 0 &&
        providedConfiguration.paths?.length > 0) {
        const configPaths = profileConfiguration.paths;
        const cliPaths = providedConfiguration.paths;
        const mergedPaths = [...configPaths, ...cliPaths];
        logger.warn(`You have specified paths in both your configuration file and as CLI arguments.\n` +
            `In a future major version, the CLI argument will override the configuration file instead of being merged.\n` +
            `To prepare for this change, see https://github.com/cucumber/cucumber-js/blob/main/docs/deprecations.md\n` +
            `  Current result:     ${mergedPaths.join(', ')}\n` +
            `  Future result:      ${cliPaths.join(', ')}`);
    }
    const original = (0, configuration_1.mergeConfigurations)(configuration_1.DEFAULT_CONFIGURATION, profileConfiguration, providedConfiguration);
    logger.debug('Resolved configuration:', original);
    (0, configuration_1.validateConfiguration)(original, logger);
    const runnable = await (0, convert_configuration_1.convertConfiguration)(logger, original, env);
    return {
        useConfiguration: original,
        runConfiguration: runnable,
    };
}
//# sourceMappingURL=load_configuration.js.map