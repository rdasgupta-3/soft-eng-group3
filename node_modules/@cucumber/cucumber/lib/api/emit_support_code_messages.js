"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitMetaMessage = emitMetaMessage;
exports.emitSupportCodeMessages = emitSupportCodeMessages;
const node_os_1 = __importDefault(require("node:os"));
const messages = __importStar(require("@cucumber/messages"));
const messages_1 = require("@cucumber/messages");
const ci_environment_1 = __importDefault(require("@cucumber/ci-environment"));
const version_1 = require("../version");
async function emitMetaMessage(eventBroadcaster, env) {
    const meta = {
        protocolVersion: messages.version,
        implementation: {
            version: version_1.version,
            name: 'cucumber-js',
        },
        cpu: {
            name: node_os_1.default.arch(),
        },
        os: {
            name: node_os_1.default.platform(),
            version: node_os_1.default.release(),
        },
        runtime: {
            name: 'node.js',
            version: process.versions.node,
        },
        ci: (0, ci_environment_1.default)(env),
    };
    eventBroadcaster.emit('envelope', {
        meta,
    });
}
function makeSourceReference(source) {
    return {
        uri: source.uri,
        location: {
            line: source.line,
        },
    };
}
function extractPatternSource(pattern) {
    if (pattern instanceof RegExp) {
        return pattern.flags ? pattern.toString() : pattern.source;
    }
    return pattern;
}
function collectParameterTypeEnvelopes(supportCodeLibrary, newId) {
    const ordered = [];
    for (const parameterType of supportCodeLibrary.parameterTypeRegistry
        .parameterTypes) {
        if (parameterType.builtin) {
            continue;
        }
        const source = supportCodeLibrary.parameterTypeRegistry.lookupSource(parameterType);
        ordered.push({
            order: source.order,
            envelope: {
                parameterType: {
                    id: newId(),
                    name: parameterType.name,
                    preferForRegularExpressionMatch: parameterType.preferForRegexpMatch,
                    regularExpressions: parameterType.regexpStrings,
                    useForSnippets: parameterType.useForSnippets,
                    sourceReference: makeSourceReference(source),
                },
            },
        });
    }
    return ordered;
}
function collectStepDefinitionEnvelopes(supportCodeLibrary) {
    return supportCodeLibrary.stepDefinitions.map((stepDefinition) => ({
        order: stepDefinition.order,
        envelope: {
            stepDefinition: {
                id: stepDefinition.id,
                pattern: {
                    source: extractPatternSource(stepDefinition.pattern),
                    type: typeof stepDefinition.pattern === 'string'
                        ? messages.StepDefinitionPatternType.CUCUMBER_EXPRESSION
                        : messages.StepDefinitionPatternType.REGULAR_EXPRESSION,
                },
                sourceReference: makeSourceReference(stepDefinition),
            },
        },
    }));
}
function collectHookEnvelopes(supportCodeLibrary) {
    const allHooks = [
        [
            supportCodeLibrary.beforeTestCaseHookDefinitions,
            messages_1.HookType.BEFORE_TEST_CASE,
        ],
        [
            supportCodeLibrary.afterTestCaseHookDefinitions,
            messages_1.HookType.AFTER_TEST_CASE,
        ],
        [
            supportCodeLibrary.beforeTestRunHookDefinitions,
            messages_1.HookType.BEFORE_TEST_RUN,
        ],
        [
            supportCodeLibrary.afterTestRunHookDefinitions,
            messages_1.HookType.AFTER_TEST_RUN,
        ],
    ];
    const ordered = [];
    allHooks.forEach(([hooks, type]) => {
        hooks.forEach((hook) => {
            ordered.push({
                order: hook.order,
                envelope: {
                    hook: {
                        id: hook.id,
                        type,
                        name: hook.name,
                        ...('tagExpression' in hook && {
                            tagExpression: hook.tagExpression,
                        }),
                        sourceReference: makeSourceReference(hook),
                    },
                },
            });
        });
    });
    return ordered;
}
function emitSupportCodeMessages({ eventBroadcaster, supportCodeLibrary, newId, }) {
    const orderedEnvelopes = [
        ...collectParameterTypeEnvelopes(supportCodeLibrary, newId),
        ...collectStepDefinitionEnvelopes(supportCodeLibrary),
        ...collectHookEnvelopes(supportCodeLibrary),
    ];
    orderedEnvelopes
        .sort((a, b) => a.order - b.order)
        .forEach(({ envelope }) => eventBroadcaster.emit('envelope', envelope));
    supportCodeLibrary.undefinedParameterTypes
        .map((undefinedParameterType) => ({
        undefinedParameterType,
    }))
        .forEach((envelope) => eventBroadcaster.emit('envelope', envelope));
}
//# sourceMappingURL=emit_support_code_messages.js.map