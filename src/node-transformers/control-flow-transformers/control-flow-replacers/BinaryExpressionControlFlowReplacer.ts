import { inject, injectable, } from 'inversify';
import { ServiceIdentifiers } from '../../../container/ServiceIdentifiers';

import * as ESTree from 'estree';

import { TControlFlowCustomNodeFactory } from '../../../types/container/custom-nodes/TControlFlowCustomNodeFactory';
import { TIdentifierNamesGeneratorFactory } from '../../../types/container/generators/TIdentifierNamesGeneratorFactory';
import { TInitialData } from '../../../types/TInitialData';

import { IControlFlowStorage } from '../../../interfaces/storages/control-flow-transformers/IControlFlowStorage';
import { ICustomNode } from '../../../interfaces/custom-nodes/ICustomNode';
import { IOptions } from '../../../interfaces/options/IOptions';
import { IRandomGenerator } from '../../../interfaces/utils/IRandomGenerator';

import { ControlFlowCustomNode } from '../../../enums/custom-nodes/ControlFlowCustomNode';

import { BinaryExpressionFunctionNode } from '../../../custom-nodes/control-flow-flattening-nodes/BinaryExpressionFunctionNode';
import { ExpressionWithOperatorControlFlowReplacer } from './ExpressionWithOperatorControlFlowReplacer';

@injectable()
export class BinaryExpressionControlFlowReplacer extends ExpressionWithOperatorControlFlowReplacer {
    /**
     * @type {number}
     */
    private static readonly usingExistingIdentifierChance: number = 0.5;

    /**
     * @param {TControlFlowCustomNodeFactory} controlFlowCustomNodeFactory
     * @param {TIdentifierNamesGeneratorFactory} identifierNamesGeneratorFactory
     * @param {IRandomGenerator} randomGenerator
     * @param {IOptions} options
     */
    public constructor (
        @inject(ServiceIdentifiers.Factory__IControlFlowCustomNode)
            controlFlowCustomNodeFactory: TControlFlowCustomNodeFactory,
        @inject(ServiceIdentifiers.Factory__IIdentifierNamesGenerator)
            identifierNamesGeneratorFactory: TIdentifierNamesGeneratorFactory,
        @inject(ServiceIdentifiers.IRandomGenerator) randomGenerator: IRandomGenerator,
        @inject(ServiceIdentifiers.IOptions) options: IOptions
    ) {
        super(
            controlFlowCustomNodeFactory,
            identifierNamesGeneratorFactory,
            randomGenerator,
            options
        );
    }

    /**
     * @param {BinaryExpression} binaryExpressionNode
     * @param {Node} parentNode
     * @param {TNodeWithLexicalScope} controlFlowStorageLexicalScopeNode
     * @param {IControlFlowStorage} controlFlowStorage
     * @returns {Node}
     */
    public replace (
        binaryExpressionNode: ESTree.BinaryExpression,
        parentNode: ESTree.Node,
        controlFlowStorage: IControlFlowStorage
    ): ESTree.Node {
        const operator: ESTree.BinaryOperator = binaryExpressionNode.operator;
        const binaryExpressionFunctionCustomNode: ICustomNode<TInitialData<BinaryExpressionFunctionNode>> =
            this.controlFlowCustomNodeFactory(ControlFlowCustomNode.BinaryExpressionFunctionNode);

        binaryExpressionFunctionCustomNode.initialize(operator);

        const storageKey: string = this.insertCustomNodeToControlFlowStorage(
            binaryExpressionFunctionCustomNode,
            controlFlowStorage,
            operator,
            BinaryExpressionControlFlowReplacer.usingExistingIdentifierChance
        );

        return this.getControlFlowStorageCallNode(
            controlFlowStorage.getStorageId(),
            storageKey,
            binaryExpressionNode.left,
            binaryExpressionNode.right
        );
    }
}
