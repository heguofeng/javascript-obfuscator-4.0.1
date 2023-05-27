import { assert } from 'chai';

import { NO_ADDITIONAL_NODES_PRESET } from '../../../../../../src/options/presets/NoCustomNodes';

import { readFileAsString } from '../../../../../helpers/readFileAsString';

import { JavaScriptObfuscator } from '../../../../../../src/JavaScriptObfuscatorFacade';

describe('CallExpressionControlFlowReplacer', function () {
    this.timeout(100000);

    describe('replace', () => {
        const variableMatch: string = '_0x([a-f0-9]){4,6}';

        describe('Variant #1 - single call expression', () => {
            const controlFlowStorageCallRegExp: RegExp = new RegExp(
                `var ${variableMatch} *= *${variableMatch}\\['\\w{5}'\\]\\(${variableMatch}, *0x1, *0x2\\);`
            );

            let obfuscatedCode: string;

            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/input-1.js');

                obfuscatedCode = JavaScriptObfuscator.obfuscate(
                    code,
                    {
                        ...NO_ADDITIONAL_NODES_PRESET,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1
                    }
                ).getObfuscatedCode();
            });

            it('should replace call expression node with call to control flow storage node', () => {
                assert.match(obfuscatedCode, controlFlowStorageCallRegExp);
            });
        });

        describe('Variant #2 - multiple call expressions with threshold = 1', () => {
            const expectedMatchErrorsCount: number = 0;
            const expectedChance: number = 0.5;

            const samplesCount: number = 1000;
            const delta: number = 0.1;

            const controlFlowStorageCallRegExp1: RegExp = new RegExp(
                `var _0x(?:[a-f0-9]){4,6} *= *(${variableMatch}\\['\\w{5}'\\])\\(${variableMatch}, *0x1, *0x2\\);`
            );
            const controlFlowStorageCallRegExp2: RegExp = new RegExp(
                `var _0x(?:[a-f0-9]){4,6} *= *(${variableMatch}\\['\\w{5}'\\])\\(${variableMatch}, *0x2, *0x3\\);`
            );

            let matchErrorsCount: number = 0,
                usingExistingIdentifierChance: number;

            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/input-2.js');

                let obfuscatedCode: string,
                    firstMatchArray: RegExpMatchArray | null,
                    secondMatchArray: RegExpMatchArray | null,
                    firstMatch: string | undefined,
                    secondMatch: string | undefined,
                    equalsValue: number = 0;

                for (let i = 0; i < samplesCount; i++) {
                    obfuscatedCode = JavaScriptObfuscator.obfuscate(
                        code,
                        {
                            ...NO_ADDITIONAL_NODES_PRESET,
                            controlFlowFlattening: true,
                            controlFlowFlatteningThreshold: 1
                        }
                    ).getObfuscatedCode();

                    firstMatchArray = obfuscatedCode.match(controlFlowStorageCallRegExp1);
                    secondMatchArray = obfuscatedCode.match(controlFlowStorageCallRegExp2);

                    if (!firstMatchArray || !secondMatchArray) {
                        matchErrorsCount++;

                        continue;
                    }

                    firstMatch = firstMatchArray ? firstMatchArray[1] : undefined;
                    secondMatch = secondMatchArray ? secondMatchArray[1] : undefined;

                    if (firstMatch === secondMatch) {
                        equalsValue++;
                    }
                }

                usingExistingIdentifierChance = equalsValue / samplesCount;
            });

            it('should replace call expression node by call to control flow storage node', () => {
                assert.equal(matchErrorsCount, expectedMatchErrorsCount);
            });

            it('should use existing identifier for control flow storage with expected chance', () => {
                assert.closeTo(usingExistingIdentifierChance, expectedChance, delta);
            });
        });

        describe('Variant #3 - call expression callee is member expression node', () => {
            const regExp: RegExp = new RegExp(
                `var ${variableMatch} *= *${variableMatch}\\['sum'\\]\\(0x1, *0x2\\);`
            );

            let obfuscatedCode: string;

            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/input-3.js');

                obfuscatedCode = JavaScriptObfuscator.obfuscate(
                    code,
                    {
                        ...NO_ADDITIONAL_NODES_PRESET,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1
                    }
                ).getObfuscatedCode();
            });

            it('shouldn\'t replace call expression node with call to control flow storage node', () => {
                assert.match(obfuscatedCode, regExp);
            });
        });

        describe('Variant #4 - rest as start call argument', () => {
            const controlFlowStorageCallRegExp: RegExp = new RegExp(
                `${variableMatch}\\['\\w{5}']\\(${variableMatch}, *\\.\\.\\.${variableMatch}, *${variableMatch}\\);`
            );
            const controlFlowStorageNodeRegExp: RegExp = new RegExp(`` +
                `'\\w{5}' *: *function *\\(${variableMatch}, *\.\.\.${variableMatch}\\) *\\{` +
                    `return *${variableMatch}\\(\.\.\.${variableMatch}\\);` +
                `\\}` +
            ``);

            let obfuscatedCode: string;

            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/rest-as-start-call-argument.js');

                obfuscatedCode = JavaScriptObfuscator.obfuscate(
                    code,
                    {
                        ...NO_ADDITIONAL_NODES_PRESET,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1
                    }
                ).getObfuscatedCode();
            });

            it('should replace call expression node with call to control flow storage node', () => {
                assert.match(obfuscatedCode, controlFlowStorageCallRegExp);
            });

            it('should keep rest parameter and rest call argument, but remove all function parameters after rest parameter', () => {
                assert.match(obfuscatedCode, controlFlowStorageNodeRegExp);
            });
        });

        describe('Variant #5 - rest as middle call argument', () => {
            const controlFlowStorageCallRegExp: RegExp = new RegExp(
                `${variableMatch}\\['\\w{5}']\\(${variableMatch}, *${variableMatch}, *\\.\\.\\.${variableMatch}, *${variableMatch}\\);`
            );
            const controlFlowStorageNodeRegExp: RegExp = new RegExp(`` +
                `'\\w{5}' *: *function *\\(${variableMatch}, *${variableMatch}, *\.\.\.${variableMatch}\\) *\\{` +
                    `return *${variableMatch}\\(${variableMatch}, *\.\.\.${variableMatch}\\);` +
                `\\}` +
            ``);

            let obfuscatedCode: string;

            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/rest-as-middle-call-argument.js');

                obfuscatedCode = JavaScriptObfuscator.obfuscate(
                    code,
                    {
                        ...NO_ADDITIONAL_NODES_PRESET,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1
                    }
                ).getObfuscatedCode();
            });

            it('should replace call expression node with call to control flow storage node', () => {
                assert.match(obfuscatedCode, controlFlowStorageCallRegExp);
            });

            it('should keep rest parameter and rest call argument, but remove all function parameters after rest parameter', () => {
                assert.match(obfuscatedCode, controlFlowStorageNodeRegExp);
            });
        });

        describe('Variant #6 - rest as last call argument', () => {
            const controlFlowStorageCallRegExp: RegExp = new RegExp(
                `${variableMatch}\\['\\w{5}']\\(${variableMatch}, *${variableMatch}, *\\.\\.\\.${variableMatch}\\);`
            );
            const controlFlowStorageNodeRegExp: RegExp = new RegExp(`` +
                `'\\w{5}' *: *function *\\(${variableMatch}, *${variableMatch}, *\.\.\.${variableMatch}\\) *\\{` +
                   `return *${variableMatch}\\(${variableMatch}, *\.\.\.${variableMatch}\\);` +
                `\\}` +
            ``);

            let obfuscatedCode: string;

            before(() => {
                const code: string = readFileAsString(__dirname + '/fixtures/rest-as-last-call-argument.js');

                obfuscatedCode = JavaScriptObfuscator.obfuscate(
                    code,
                    {
                        ...NO_ADDITIONAL_NODES_PRESET,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1
                    }
                ).getObfuscatedCode();
            });

            it('should replace call expression node with call to control flow storage node', () => {
                assert.match(obfuscatedCode, controlFlowStorageCallRegExp);
            });

            it('should keep rest parameter and rest call argument inside control flow storage node function', () => {
                assert.match(obfuscatedCode, controlFlowStorageNodeRegExp);
            });
        });
    });
});
