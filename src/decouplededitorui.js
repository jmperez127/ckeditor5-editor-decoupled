/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module editor-decoupled/decouplededitorui
 */

import ComponentFactory from '@ckeditor/ckeditor5-ui/src/componentfactory';
import FocusTracker from '@ckeditor/ckeditor5-utils/src/focustracker';
import enableToolbarKeyboardFocus from '@ckeditor/ckeditor5-ui/src/toolbar/enabletoolbarkeyboardfocus';
import normalizeToolbarConfig from '@ckeditor/ckeditor5-ui/src/toolbar/normalizetoolbarconfig';

/**
 * The decoupled editor UI class.
 *
 * @implements module:core/editor/editorui~EditorUI
 */
export default class DecoupledEditorUI {
	/**
	 * Creates an instance of the editor UI class.
	 *
	 * @param {module:core/editor/editor~Editor} editor The editor instance.
	 * @param {module:ui/editorui/editoruiview~EditorUIView} view The view of the UI.
	 */
	constructor( editor, view ) {
		/**
		 * @inheritDoc
		 */
		this.editor = editor;

		/**
		 * @inheritDoc
		 */
		this.view = view;

		/**
		 * @inheritDoc
		 */
		this.componentFactory = new ComponentFactory( editor );

		/**
		 * @inheritDoc
		 */
		this.focusTracker = new FocusTracker();

		/**
		 * A normalized `config.toolbar` object.
		 *
		 * @type {Object}
		 * @private
		 */
		this._toolbarConfig = normalizeToolbarConfig( editor.config.get( 'toolbar' ) );

		/**
		 * A container of the {@link module:editor-decoupled/decouplededitoruiview~DecoupledEditorUIView#toolbar}.
		 *
		 * @type {HTMLElement|String}
		 * @private
		 */
		this._toolbarContainer = editor.config.get( 'toolbarContainer' );

		/**
		 * A container of the {@link module:editor-decoupled/decouplededitoruiview~DecoupledEditorUIView#editable}.
		 *
		 * @type {HTMLElement|String}
		 * @private
		 */
		this._editableContainer = editor.config.get( 'editableContainer' );
	}

	/**
	 * Initializes the UI.
	 */
	init() {
		const editor = this.editor;
		const view = this.view;

		view.render();

		// Setup the editable.
		const editingRoot = editor.editing.view.document.getRoot();
		view.editable.bind( 'isReadOnly' ).to( editingRoot );
		view.editable.bind( 'isFocused' ).to( editor.editing.view.document );
		view.editable.name = editingRoot.rootName;

		this.focusTracker.add( this.view.editableElement );
		this.view.toolbar.fillFromConfig( this._toolbarConfig.items, this.componentFactory );

		if ( this._toolbarContainer ) {
			this._toolbarContainer.appendChild( view.toolbar.element );
		}

		if ( this._editableContainer ) {
			this._editableContainer.appendChild( view.editable.element );
		}

		enableToolbarKeyboardFocus( {
			origin: editor.editing.view,
			originFocusTracker: this.focusTracker,
			originKeystrokeHandler: editor.keystrokes,
			toolbar: this.view.toolbar
		} );
	}

	/**
	 * Destroys the UI.
	 */
	destroy() {
		this.view.destroy( !!this._toolbarContainer, !!this._editableContainer );
	}
}