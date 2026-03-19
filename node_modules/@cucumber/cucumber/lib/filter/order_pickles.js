"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderPickles = orderPickles;
const knuth_shuffle_seeded_1 = __importDefault(require("knuth-shuffle-seeded"));
// Orders the pickleIds in place - morphs input
function orderPickles(pickleIds, order, logger) {
    const [type, seed] = splitOrder(order);
    switch (type) {
        case 'defined':
            break;
        case 'reverse':
            pickleIds.reverse();
            break;
        case 'random':
            if (seed === '') {
                const newSeed = Math.floor(Math.random() * 1000 * 1000).toString();
                logger.warn(`Random order using seed: ${newSeed}`);
                (0, knuth_shuffle_seeded_1.default)(pickleIds, newSeed);
            }
            else {
                (0, knuth_shuffle_seeded_1.default)(pickleIds, seed);
            }
            break;
        default:
            throw new Error('Unrecognized order type. Should be `defined` or `random`');
    }
}
function splitOrder(order) {
    if (!order.includes(':')) {
        return [order, ''];
    }
    return order.split(':');
}
//# sourceMappingURL=order_pickles.js.map