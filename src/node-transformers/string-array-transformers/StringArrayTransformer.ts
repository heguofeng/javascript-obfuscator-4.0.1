import { inject, injectable, } from 'inversify';
import { ServiceIdentifiers } from '../../container/ServiceIdentifiers';

import * as ESTree from 'estree';

import { TIdentifierNamesGeneratorFactory } from '../../types/container/generators/TIdentifierNamesGeneratorFactory';
import { TInitialData } from '../../types/TInitialData';
import { TNodeWithLexicalScopeStatements } from '../../types/node/TNodeWithLexicalScopeStatements';
import { TStatement } from '../../types/node/TStatement';
import { TStringArrayScopeCallsWrappersDataByEncoding } from '../../types/node-transformers/string-array-transformers/TStringArrayScopeCallsWrappersDataByEncoding';
import { TStringArrayCustomNodeFactory } from '../../types/container/custom-nodes/TStringArrayCustomNodeFactory';

import { ICustomNode } from '../../interfaces/custom-nodes/ICustomNode';
import { IIdentifierNamesGenerator } from '../../interfaces/generators/identifier-names-generators/IIdentifierNamesGenerator';
import { ILiteralNodesCacheStorage } from '../../interfaces/storages/string-array-transformers/ILiteralNodesCacheStorage';
import { IOptions } from '../../interfaces/options/IOptions';
import { IRandomGenerator } from '../../interfaces/utils/IRandomGenerator';
import { IStringArrayScopeCallsWrapperData } from '../../interfaces/node-transformers/string-array-transformers/IStringArrayScopeCallsWrapperData';
import { IStringArrayScopeCallsWrappersDataStorage } from '../../interfaces/storages/string-array-transformers/IStringArrayScopeCallsWrappersDataStorage';
import { IStringArrayScopeCallsWrapperParameterIndexesData } from '../../interfaces/node-transformers/string-array-transformers/IStringArrayScopeCallsWrapperParameterIndexesData';
import { IStringArrayStorage } from '../../interfaces/storages/string-array-transformers/IStringArrayStorage';
import { IStringArrayStorageAnalyzer } from '../../interfaces/analyzers/string-array-storage-analyzer/IStringArrayStorageAnalyzer';
import { IStringArrayStorageItemData } from '../../interfaces/storages/string-array-transformers/IStringArrayStorageItem';
import { IVisitedLexicalScopeNodesStackStorage } from '../../interfaces/storages/string-array-transformers/IVisitedLexicalScopeNodesStackStorage';
import { IVisitor } from '../../interfaces/node-transformers/IVisitor';

import { NodeTransformer } from '../../enums/node-transformers/NodeTransformer';
import { NodeTransformationStage } from '../../enums/node-transformers/NodeTransformationStage';
import { StringArrayCustomNode } from '../../enums/custom-nodes/StringArrayCustomNode';
import { StringArrayWrappersType } from '../../enums/node-transformers/string-array-transformers/StringArrayWrappersType';

import { AbstractNodeTransformer } from '../AbstractNodeTransformer';
import { NodeGuards } from '../../node/NodeGuards';
import { NodeLiteralUtils } from '../../node/NodeLiteralUtils';
import { NodeMetadata } from '../../node/NodeMetadata';
import { NodeUtils } from '../../node/NodeUtils';
import { StringArrayCallNode } from '../../custom-nodes/string-array-nodes/StringArrayCallNode';

@injectable()
export class StringArrayTransformer extends AbstractNodeTransformer {
    /**
     * @type {number}
     */
    private static readonly minShiftedIndexValue: number = -1000;

    /**
     * @type {number}
     */
    private static readonly maxShiftedIndexValue: number = 1000;

    /**
     * @type {NodeTransformer[]}
     */
    public override readonly runAfter: NodeTransformer[] = [
        NodeTransformer.StringArrayRotateFunctionTransformer
    ];

    /**
     * @type {IIdentifierNamesGenerator}
     */
    private readonly identifierNamesGenerator: IIdentifierNamesGenerator;

    /**
     * @type {ILiteralNodesCacheStorage}
     */
    private readonly literalNodesCacheStorage: ILiteralNodesCacheStorage;

    /**
     * @type {IStringArrayStorage}
     */
    private readonly stringArrayStorage: IStringArrayStorage;

    /**
     * @type {IStringArrayStorageAnalyzer}
     */
    private readonly stringArrayStorageAnalyzer: IStringArrayStorageAnalyzer;

    /**
     * @type {IStringArrayScopeCallsWrappersDataStorage}
     */
    private readonly stringArrayScopeCallsWrappersDataStorage: IStringArrayScopeCallsWrappersDataStorage;

    /**
     * @type {TStringArrayCustomNodeFactory}
     */
    private readonly stringArrayTransformerCustomNodeFactory: TStringArrayCustomNodeFactory;

    /**
     * @type {IVisitedLexicalScopeNodesStackStorage}
     */
    private readonly visitedLexicalScopeNodesStackStorage: IVisitedLexicalScopeNodesStackStorage;

    /**
     * @param {IRandomGenerator} randomGenerator
     * @param {IOptions} options
     * @param {ILiteralNodesCacheStorage} literalNodesCacheStorage
     * @param {IVisitedLexicalScopeNodesStackStorage} visitedLexicalScopeNodesStackStorage
     * @param {IStringArrayStorage} stringArrayStorage
     * @param {IStringArrayScopeCallsWrappersDataStorage} stringArrayScopeCallsWrappersDataStorage
     * @param {IStringArrayStorageAnalyzer} stringArrayStorageAnalyzer
     * @param {TIdentifierNamesGeneratorFactory} identifierNamesGeneratorFactory
     * @param {TStringArrayCustomNodeFactory} stringArrayTransformerCustomNodeFactory
     */
    public constructor(
        @inject(ServiceIdentifiers.IRandomGenerator) randomGenerator: IRandomGenerator,
        @inject(ServiceIdentifiers.IOptions) options: IOptions,
        @inject(ServiceIdentifiers.ILiteralNodesCacheStorage) literalNodesCacheStorage: ILiteralNodesCacheStorage,
        @inject(ServiceIdentifiers.IVisitedLexicalScopeNodesStackStorage) visitedLexicalScopeNodesStackStorage: IVisitedLexicalScopeNodesStackStorage,
        @inject(ServiceIdentifiers.IStringArrayStorage) stringArrayStorage: IStringArrayStorage,
        @inject(ServiceIdentifiers.IStringArrayScopeCallsWrappersDataStorage)
        stringArrayScopeCallsWrappersDataStorage: IStringArrayScopeCallsWrappersDataStorage,
        @inject(ServiceIdentifiers.IStringArrayStorageAnalyzer) stringArrayStorageAnalyzer: IStringArrayStorageAnalyzer,
        @inject(ServiceIdentifiers.Factory__IIdentifierNamesGenerator)
        identifierNamesGeneratorFactory: TIdentifierNamesGeneratorFactory,
        @inject(ServiceIdentifiers.Factory__IStringArrayCustomNode)
        stringArrayTransformerCustomNodeFactory: TStringArrayCustomNodeFactory
    ) {
        super(randomGenerator, options);

        this.literalNodesCacheStorage = literalNodesCacheStorage;
        this.visitedLexicalScopeNodesStackStorage = visitedLexicalScopeNodesStackStorage;
        this.stringArrayStorage = stringArrayStorage;
        this.stringArrayScopeCallsWrappersDataStorage = stringArrayScopeCallsWrappersDataStorage;
        this.stringArrayStorageAnalyzer = stringArrayStorageAnalyzer;
        this.identifierNamesGenerator = identifierNamesGeneratorFactory(options);
        this.stringArrayTransformerCustomNodeFactory = stringArrayTransformerCustomNodeFactory;
    }

    /**
     * @param {NodeTransformationStage} nodeTransformationStage
     * @returns {IVisitor | null}
     */
    public getVisitor(nodeTransformationStage: NodeTransformationStage): IVisitor | null {
        switch (nodeTransformationStage) {
            case NodeTransformationStage.StringArray:
                return {
                    enter: (node: ESTree.Node, parentNode: ESTree.Node | null): ESTree.Node | undefined => {
                        if (NodeGuards.isProgramNode(node)) {
                            this.prepareNode(node);
                        }

                        if (
                            parentNode
                            && NodeGuards.isLiteralNode(node)
                            && !NodeMetadata.isStringArrayCallLiteralNode(node)
                        ) {
                            var in_async_function = false;
                            var point = "-";
                            function detect_async_function(node: ESTree.Node) {
                                console.log(point, node.type);
                                if (node.type == "FunctionDeclaration") {
                                    console.log(point, node.id?.name);
                                }
                                if ((node.type == "ArrowFunctionExpression" || node.type == "FunctionDeclaration" || node.type == "FunctionExpression") && node.async == true) {
                                    in_async_function = true;
                                    return;
                                }
                                if (node.type == "Program") {
                                    return;
                                }

                                if (node.parentNode) {
                                    point = point + "-";
                                    detect_async_function(node.parentNode)
                                } else {
                                    in_async_function = true;
                                    return;
                                }
                            }
                            detect_async_function(node);
                            console.log(node.value, node.loc);
                            if (in_async_function == false) {
                                return this.transformNode(node, parentNode);
                            }
                        }
                    }
                };

            default:
                return null;
        }
    }

    /**
     * @param {Program} programNode
     */
    public prepareNode(programNode: ESTree.Program): void {
        if (this.options.stringArray) {
            this.stringArrayStorageAnalyzer.analyze(programNode);
        }

        if (this.options.stringArrayShuffle) {
            this.stringArrayStorage.shuffleStorage();
        }

        if (this.options.stringArrayRotate) {
            this.stringArrayStorage.rotateStorage();
        }
    }

    /**
     * @param {Literal} literalNode
     * @param {NodeGuards} parentNode
     * @returns {NodeGuards}
     */
    public transformNode(literalNode: ESTree.Literal, parentNode: ESTree.Node): ESTree.Node {
        if (
            !NodeLiteralUtils.isStringLiteralNode(literalNode)
            || NodeLiteralUtils.isProhibitedLiteralNode(literalNode, parentNode)
        ) {
            return literalNode;
        }

        const literalValue: ESTree.SimpleLiteral['value'] = literalNode.value;

        const stringArrayStorageItemData: IStringArrayStorageItemData | undefined =
            this.stringArrayStorageAnalyzer.getItemDataForLiteralNode(literalNode);
        const cacheKey: string = this.literalNodesCacheStorage.buildKey(literalValue, stringArrayStorageItemData);
        const useCachedValue: boolean = this.literalNodesCacheStorage.shouldUseCachedValue(cacheKey, stringArrayStorageItemData);

        let resultNode: ESTree.Node;

        if (useCachedValue) {
            const nodeFromCache: ESTree.Node = <ESTree.Node>this.literalNodesCacheStorage.get(cacheKey);

            resultNode = NodeUtils.clone(nodeFromCache);
        } else {
            resultNode = stringArrayStorageItemData
                ? this.getStringArrayCallNode(stringArrayStorageItemData)
                : literalNode;
            this.literalNodesCacheStorage.set(cacheKey, resultNode);
        }

        NodeUtils.parentizeNode(resultNode, parentNode);

        return resultNode;
    }

    /**
     * @param {IStringArrayStorageItemData} stringArrayStorageItemData
     * @returns {Expression}
     */
    private getStringArrayCallNode(stringArrayStorageItemData: IStringArrayStorageItemData): ESTree.Expression {
        const stringArrayScopeCallsWrapperData: IStringArrayScopeCallsWrapperData =
            this.getStringArrayScopeCallsWrapperData(stringArrayStorageItemData);
        const { decodeKey, index } = stringArrayStorageItemData;

        const stringArrayCallCustomNode: ICustomNode<TInitialData<StringArrayCallNode>> =
            this.stringArrayTransformerCustomNodeFactory(StringArrayCustomNode.StringArrayCallNode);

        stringArrayCallCustomNode.initialize(
            index,
            this.stringArrayStorage.getIndexShiftAmount(),
            stringArrayScopeCallsWrapperData,
            decodeKey
        );

        const statementNode: TStatement = stringArrayCallCustomNode.getNode()[0];

        if (!NodeGuards.isExpressionStatementNode(statementNode)) {
            throw new Error('`stringArrayCallCustomNode.getNode()[0]` should returns array with `ExpressionStatement` node');
        }

        return statementNode.expression;
    }

    /**
     * @param {IStringArrayStorageItemData} stringArrayStorageItemData
     * @returns {IStringArrayScopeCallsWrapperData}
     */
    private getStringArrayScopeCallsWrapperData(
        stringArrayStorageItemData: IStringArrayStorageItemData
    ): IStringArrayScopeCallsWrapperData {
        return !this.options.stringArrayWrappersCount
            ? this.getRootStringArrayScopeCallsWrapperData(stringArrayStorageItemData)
            : this.getUpperStringArrayScopeCallsWrapperData(stringArrayStorageItemData);
    }

    /**
     * @param {IStringArrayStorageItemData} stringArrayStorageItemData
     * @returns {IStringArrayScopeCallsWrapperData}
     */
    private getRootStringArrayScopeCallsWrapperData(
        stringArrayStorageItemData: IStringArrayStorageItemData
    ): IStringArrayScopeCallsWrapperData {
        const { encoding } = stringArrayStorageItemData;

        const rootStringArrayCallsWrapperName: string = this.stringArrayStorage.getStorageCallsWrapperName(encoding);

        return {
            name: rootStringArrayCallsWrapperName,
            index: 0,
            parameterIndexesData: null
        };
    }

    /**
     * @param {IStringArrayStorageItemData} stringArrayStorageItemData
     * @returns {IStringArrayScopeCallsWrapperData}
     */
    private getUpperStringArrayScopeCallsWrapperData(
        stringArrayStorageItemData: IStringArrayStorageItemData
    ): IStringArrayScopeCallsWrapperData {
        const { encoding } = stringArrayStorageItemData;
        const currentLexicalScopeBodyNode: TNodeWithLexicalScopeStatements | null =
            this.visitedLexicalScopeNodesStackStorage.getLastElement() ?? null;

        if (!currentLexicalScopeBodyNode) {
            throw new Error('Cannot find current lexical scope body node');
        }

        const stringArrayScopeCallsWrappersDataByEncoding: TStringArrayScopeCallsWrappersDataByEncoding =
            this.getAndUpdateStringArrayScopeCallsWrappersDataByEncoding(
                currentLexicalScopeBodyNode,
                stringArrayStorageItemData
            );

        const stringArrayScopeCallsWrappersData: IStringArrayScopeCallsWrapperData[] =
            stringArrayScopeCallsWrappersDataByEncoding[encoding]?.scopeCallsWrappersData ?? [];

        return this.randomGenerator
            .getRandomGenerator()
            .pickone(stringArrayScopeCallsWrappersData);
    }

    /**
     * @param {TNodeWithLexicalScopeStatements} currentLexicalScopeBodyNode
     * @param {IStringArrayStorageItemData} stringArrayStorageItemData
     * @returns {TStringArrayScopeCallsWrappersDataByEncoding}
     */
    private getAndUpdateStringArrayScopeCallsWrappersDataByEncoding(
        currentLexicalScopeBodyNode: TNodeWithLexicalScopeStatements,
        stringArrayStorageItemData: IStringArrayStorageItemData,
    ): TStringArrayScopeCallsWrappersDataByEncoding {
        const { encoding } = stringArrayStorageItemData;
        const stringArrayScopeCallsWrappersDataByEncoding: TStringArrayScopeCallsWrappersDataByEncoding =
            this.stringArrayScopeCallsWrappersDataStorage.get(currentLexicalScopeBodyNode)
            ?? {};

        const stringArrayScopeCallsWrappersData: IStringArrayScopeCallsWrapperData[] =
            stringArrayScopeCallsWrappersDataByEncoding[encoding]?.scopeCallsWrappersData ?? [];
        const isFilledScopeCallsWrapperNamesList: boolean =
            stringArrayScopeCallsWrappersData.length === this.options.stringArrayWrappersCount;

        if (isFilledScopeCallsWrapperNamesList) {
            return stringArrayScopeCallsWrappersDataByEncoding;
        }

        // have to use `generateForGlobalScope` for program node for correct attach prefix to the calls wrapper name
        const nextScopeCallsWrapperName: string = NodeGuards.isProgramNode(currentLexicalScopeBodyNode)
            ? this.identifierNamesGenerator.generateForGlobalScope()
            : this.identifierNamesGenerator.generateNext();
        const nextScopeCallsWrapperShiftedIndex: number =
            this.getStringArrayCallsWrapperShiftedIndex();
        const nextScopeCallsWrapperParameterIndexesData: IStringArrayScopeCallsWrapperParameterIndexesData | null =
            this.getStringArrayCallsWrapperParameterIndexesData();

        stringArrayScopeCallsWrappersDataByEncoding[encoding] = {
            encoding,
            scopeCallsWrappersData: [
                ...stringArrayScopeCallsWrappersData,
                {
                    name: nextScopeCallsWrapperName,
                    index: nextScopeCallsWrapperShiftedIndex,
                    parameterIndexesData: nextScopeCallsWrapperParameterIndexesData
                }
            ]
        };

        this.stringArrayScopeCallsWrappersDataStorage.set(
            currentLexicalScopeBodyNode,
            stringArrayScopeCallsWrappersDataByEncoding
        );

        return stringArrayScopeCallsWrappersDataByEncoding;
    }

    /**
     * @returns {number}
     */
    private getStringArrayCallsWrapperShiftedIndex(): number {
        return this.options.stringArrayWrappersType === StringArrayWrappersType.Function
            ? this.randomGenerator.getRandomInteger(
                StringArrayTransformer.minShiftedIndexValue,
                StringArrayTransformer.maxShiftedIndexValue
            )
            : 0;
    }

    /**
     * @returns {IStringArrayScopeCallsWrapperParameterIndexesData | null}
     */
    private getStringArrayCallsWrapperParameterIndexesData(): IStringArrayScopeCallsWrapperParameterIndexesData | null {
        if (this.options.stringArrayWrappersType !== StringArrayWrappersType.Function) {
            return null;
        }

        const minIndexValue: number = 0;
        const maxIndexValue: number = this.options.stringArrayWrappersParametersMaxCount - 1;

        const valueIndexParameterIndex: number = this.randomGenerator
            .getRandomInteger(minIndexValue, maxIndexValue);
        const decodeKeyParameterIndex: number = this.randomGenerator
            .getRandomIntegerExcluding(minIndexValue, maxIndexValue, [valueIndexParameterIndex]);

        return {
            valueIndexParameterIndex,
            decodeKeyParameterIndex
        };
    }
}
