/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document, setTimeout */

import DecoupledEditorUI from '../src/decouplededitorui';
import DecoupledEditorUIView from '../src/decouplededitoruiview';

import HtmlDataProcessor from '@ckeditor/ckeditor5-engine/src/dataprocessor/htmldataprocessor';

import DecoupledEditor from '../src/decouplededitor';
import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Bold from '@ckeditor/ckeditor5-basic-styles/src/bold';
import DataApiMixin from '@ckeditor/ckeditor5-core/src/editor/utils/dataapimixin';
import RootElement from '@ckeditor/ckeditor5-engine/src/model/rootelement';

import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import log from '@ckeditor/ckeditor5-utils/src/log';

import { describeMemoryUsage, testMemoryUsage } from '@ckeditor/ckeditor5-core/tests/_utils/memory';
import ArticlePluginSet from '@ckeditor/ckeditor5-core/tests/_utils/articlepluginset';

const editorData = '<p><strong>foo</strong> bar</p>';

describe( 'DecoupledEditor', () => {
	let editor;

	testUtils.createSinonSandbox();

	beforeEach( () => {
		testUtils.sinon.stub( log, 'warn' ).callsFake( () => {} );
	} );

	describe( 'constructor()', () => {
		beforeEach( () => {
			editor = new DecoupledEditor();
		} );

		it( 'uses HTMLDataProcessor', () => {
			expect( editor.data.processor ).to.be.instanceof( HtmlDataProcessor );
		} );

		it( 'has a Data Interface', () => {
			expect( testUtils.isMixed( DecoupledEditor, DataApiMixin ) ).to.be.true;
		} );

		it( 'creates main root element', () => {
			expect( editor.model.document.getRoot( 'main' ) ).to.instanceof( RootElement );
		} );

		describe( 'ui', () => {
			it( 'is created', () => {
				editor.ui.init();

				expect( editor.ui ).to.be.instanceof( DecoupledEditorUI );
				expect( editor.ui.view ).to.be.instanceof( DecoupledEditorUIView );

				editor.ui.destroy();
			} );
		} );
	} );

	describe( 'create()', () => {
		it( 'should properly handled async data initialization', done => {
			const spy = sinon.spy();
			let resolver;

			class AsyncDataInit extends Plugin {
				init() {
					this.editor.data.on( 'ready', () => spy( 'ready' ) );

					this.editor.data.on( 'init', evt => {
						evt.stop();
						evt.return = new Promise( resolve => {
							resolver = () => {
								spy( 'asyncInit' );
								// Since we stop `init` event, `data#ready` needs to be fired manually.
								this.editor.data.fire( 'ready' );
								resolve();
							};
						} );
					}, { priority: 'high' } );
				}
			}

			DecoupledEditor.create( '<p>foo bar</p>', {
				plugins: [ Paragraph, Bold, AsyncDataInit ]
			} ).then( editor => {
				sinon.assert.calledWith( spy.firstCall, 'asyncInit' );
				sinon.assert.calledWith( spy.secondCall, 'ready' );

				editor.destroy().then( done );
			} );

			// Resolve init promise in next cycle to hold data initialization.
			setTimeout( () => resolver() );
		} );

		describe( 'editor with data', () => {
			test( () => editorData );
		} );

		describe( 'editor with editable element', () => {
			let editableElement;

			beforeEach( () => {
				editableElement = document.createElement( 'div' );
				editableElement.innerHTML = editorData;
			} );

			test( () => editableElement );
		} );

		it( 'initializes with config.initialData', () => {
			return DecoupledEditor.create( document.createElement( 'div' ), {
				initialData: '<p>Hello world!</p>',
				plugins: [ Paragraph ]
			} ).then( editor => {
				expect( editor.getData() ).to.equal( '<p>Hello world!</p>' );

				editor.destroy();
			} );
		} );

		it( 'throws if initial data is passed in Editor#create and config.initialData is also used', done => {
			DecoupledEditor.create( '<p>Hello world!</p>', {
				initialData: '<p>I am evil!</p>',
				plugins: [ Paragraph ]
			} ).catch( () => {
				done();
			} );
		} );

		function test( getElementOrData ) {
			it( 'creates an instance which inherits from the DecoupledEditor', () => {
				return DecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold ]
					} )
					.then( newEditor => {
						expect( newEditor ).to.be.instanceof( DecoupledEditor );

						return newEditor.destroy();
					} );
			} );

			it( 'loads the initial data', () => {
				return DecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold ]
					} )
					.then( newEditor => {
						expect( newEditor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );

						return newEditor.destroy();
					} );
			} );

			it( 'should not require config object', () => {
				// Just being safe with `builtinPlugins` static property.
				class CustomDecoupledEditor extends DecoupledEditor {}
				CustomDecoupledEditor.builtinPlugins = [ Paragraph, Bold ];

				return CustomDecoupledEditor.create( getElementOrData() )
					.then( newEditor => {
						expect( newEditor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );

						return newEditor.destroy();
					} );
			} );

			// https://github.com/ckeditor/ckeditor5-editor-classic/issues/53
			it( 'creates an instance of a DecoupledEditor child class', () => {
				class CustomDecoupledEditor extends DecoupledEditor {}

				return CustomDecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold ]
					} )
					.then( newEditor => {
						expect( newEditor ).to.be.instanceof( CustomDecoupledEditor );
						expect( newEditor ).to.be.instanceof( DecoupledEditor );

						expect( newEditor.getData() ).to.equal( '<p><strong>foo</strong> bar</p>' );

						return newEditor.destroy();
					} );
			} );

			// https://github.com/ckeditor/ckeditor5-editor-decoupled/issues/3
			it( 'initializes the data controller', () => {
				let dataInitSpy;

				class DataInitAssertPlugin extends Plugin {
					constructor( editor ) {
						super();

						this.editor = editor;
					}

					init() {
						dataInitSpy = sinon.spy( this.editor.data, 'init' );
					}
				}

				return DecoupledEditor
					.create( getElementOrData(), {
						plugins: [ Paragraph, Bold, DataInitAssertPlugin ]
					} )
					.then( newEditor => {
						sinon.assert.calledOnce( dataInitSpy );

						return newEditor.destroy();
					} );
			} );

			describe( 'events', () => {
				it( 'fires all events in the right order', () => {
					const fired = [];

					function spy( evt ) {
						fired.push( `${ evt.name }-${ evt.source.constructor.name.toLowerCase() }` );
					}

					class EventWatcher extends Plugin {
						init() {
							this.editor.ui.on( 'ready', spy );
							this.editor.data.on( 'ready', spy );
							this.editor.on( 'ready', spy );
						}
					}

					return DecoupledEditor
						.create( getElementOrData(), {
							plugins: [ EventWatcher ]
						} )
						.then( newEditor => {
							expect( fired ).to.deep.equal( [
								'ready-decouplededitorui',
								'ready-datacontroller',
								'ready-decouplededitor'
							] );

							return newEditor.destroy();
						} );
				} );

				it( 'fires ready once UI is rendered', () => {
					let isReady;

					class EventWatcher extends Plugin {
						init() {
							this.editor.ui.on( 'ready', () => {
								isReady = this.editor.ui.view.isRendered;
							} );
						}
					}

					return DecoupledEditor
						.create( getElementOrData(), {
							plugins: [ EventWatcher ]
						} )
						.then( newEditor => {
							expect( isReady ).to.be.true;

							return newEditor.destroy();
						} );
				} );
			} );
		}
	} );

	describe( 'destroy', () => {
		describe( 'editor with data', () => {
			beforeEach( function() {
				return DecoupledEditor
					.create( editorData, { plugins: [ Paragraph ] } )
					.then( newEditor => {
						editor = newEditor;
					} );
			} );

			test( () => editorData );
		} );

		describe( 'editor with editable element', () => {
			let editableElement;

			beforeEach( function() {
				editableElement = document.createElement( 'div' );
				editableElement.innerHTML = editorData;

				return DecoupledEditor
					.create( editableElement, { plugins: [ Paragraph ] } )
					.then( newEditor => {
						editor = newEditor;
					} );
			} );

			it( 'sets data back to the element', () => {
				editor.setData( '<p>foo</p>' );

				return editor.destroy()
					.then( () => {
						expect( editableElement.innerHTML ).to.equal( '<p>foo</p>' );
					} );
			} );

			test( () => editableElement );
		} );

		function test() {
			it( 'destroys the UI', () => {
				const spy = sinon.spy( editor.ui, 'destroy' );

				return editor.destroy()
					.then( () => {
						sinon.assert.calledOnce( spy );
					} );
			} );
		}
	} );

	describeMemoryUsage( () => {
		testMemoryUsage(
			'should not grow on multiple create/destroy',
			() => DecoupledEditor
				.create( document.querySelector( '#mem-editor' ), {
					plugins: [ ArticlePluginSet ],
					toolbar: [ 'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote' ],
					image: {
						toolbar: [ 'imageStyle:full', 'imageStyle:side', '|', 'imageTextAlternative' ]
					}
				} ) );
	} );
} );
