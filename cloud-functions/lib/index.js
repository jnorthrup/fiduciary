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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RollbackHandlers = exports.AuthHandlers = exports.DeploymentHandlers = exports.serveApp = exports.triggerManualRollback = exports.onRollback = exports.onUserDelete = exports.onUserCreate = exports.onDeploy = void 0;
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
var onDeploy_1 = require("./onDeploy");
Object.defineProperty(exports, "onDeploy", { enumerable: true, get: function () { return onDeploy_1.onDeploy; } });
var onAuthChange_1 = require("./onAuthChange");
Object.defineProperty(exports, "onUserCreate", { enumerable: true, get: function () { return onAuthChange_1.onUserCreate; } });
Object.defineProperty(exports, "onUserDelete", { enumerable: true, get: function () { return onAuthChange_1.onUserDelete; } });
var onRollback_1 = require("./onRollback");
Object.defineProperty(exports, "onRollback", { enumerable: true, get: function () { return onRollback_1.onRollback; } });
Object.defineProperty(exports, "triggerManualRollback", { enumerable: true, get: function () { return onRollback_1.triggerManualRollback; } });
var serveApp_1 = require("./serveApp");
Object.defineProperty(exports, "serveApp", { enumerable: true, get: function () { return serveApp_1.serveApp; } });
exports.DeploymentHandlers = require('./onDeploy').DeploymentHealthCheck;
exports.AuthHandlers = require('./onAuthChange').AuthChangeHandlers;
exports.RollbackHandlers = require('./onRollback').RollbackHandlers;
//# sourceMappingURL=index.js.map