import ko from 'knockout';
import templateMarkup from 'text!./play-activity-page.html';
import Preferences from 'app/preferences';
import AutoIncluder from 'components/editor/auto-include';
import * as SysGlobalObservables from 'app/sys-global-observables';

const defaultEditorText =
`#
# Write your TCL code here
# This file (program.tcl) will be overwritten if you navigate away from
# the page or to a different lesson! To save your code, either
# download the file to your computer, or rename program.tcl to
# something else and it will be persisted until you clear your
# browser's localStorage. Both actions, and more, can be done through
# the File Browser.

proc hello_tcl {name} {
    puts "Hello, $name from TCL version [info tclversion]\\n"
}

hello_tcl "Your name"
`;
const defaultBuildCmd = 'echo TCL does not require a build';
const defaultExecCmd = '/usr/bin/tclsh program.tcl';

class PlayActivityPage {

    constructor(params) {
        this.activityData = params.activityData;
        this.setEditorParams();
        this.setCompilerParams();
        this.setVmParams();
        this.setupCompileCallbacks();
        if (this.activityData) {
            this.setParamsFromActivity(this.activityData.activity);
        } else {
            this.setParamsFromDefaults();
        }
        this.autoIncluder = new AutoIncluder();
    }

    setParamsFromActivity(playActivity) {
        let editorText = defaultEditorText;
        if (typeof playActivity.code !== 'undefined') {
            editorText = playActivity.code;
        }
        this.editorParams.initialEditorText = editorText;

        let buildCmd = defaultBuildCmd;
        if (typeof playActivity.buildCmd !== 'undefined') {
            buildCmd = playActivity.buildCmd;
        } else if (typeof playActivity.gccOptions !== 'undefined') {
            buildCmd = 'echo TCL does not require compile';
        }
        this.compilerParams.buildCmd(buildCmd);

        let execCmd = defaultExecCmd;
        if (typeof playActivity.execCmd !== 'undefined') {
            execCmd = playActivity.execCmd;
        } else if (typeof playActivity.programCommandLineArgs !== 'undefined') {
            execCmd = `./program ${playActivity.programCommandLineArgs}`;
        }
        this.compilerParams.execCmd(execCmd);

        if (playActivity.docFile) {
            this.doc = {
                url: 'https://cs-education.github.io/sysassets/' + playActivity.docFile,
                format: 'markdown'
            };
        } else {
            this.doc = {
                text: playActivity.doc || '',
                format: 'markdown'
            };
        }
    }

    setParamsFromDefaults() {
        this.editorParams.initialEditorText = defaultEditorText;
        this.compilerParams.buildCmd(defaultBuildCmd);
        this.compilerParams.execCmd(defaultExecCmd);

        this.doc = {
            text: '# Welcome\n' +
                'Welcome to this tiny but fast linux virtual machine. ' +
                'Write TCL code on the left and press the run button, or simply have fun with the linux command line below!\n',
            format: 'markdown'
        };
    }

    setEditorParams() {
        const editorPrefs = Preferences.getPreferenceManager('editor');

        const autoIndent = ko.observable(editorPrefs.getItem('autoindent', 'true') === 'true');
        autoIndent.subscribe((newSetting) => editorPrefs.setItem('autoindent', newSetting));

        const highlightLine = ko.observable(editorPrefs.getItem('highlightline', 'true') === 'true');
        highlightLine.subscribe((newSetting) => editorPrefs.setItem('highlightline', newSetting));

        const showInvisibles = ko.observable(editorPrefs.getItem('showinvisibles', 'false') === 'true');
        showInvisibles.subscribe((newSetting) => editorPrefs.setItem('showinvisibles', newSetting));

        const theme = ko.observable(editorPrefs.getItem('theme', 'tomorrow'));
        theme.subscribe((newSetting) => editorPrefs.setItem('theme', newSetting));

        const fontSize = ko.observable(editorPrefs.getItem('fontsize', 12));
        fontSize.subscribe((newSetting) => editorPrefs.setItem('fontsize', newSetting));

        const autoInclude = ko.observable(editorPrefs.getItem('autoInclude', 'true') === 'true');
        autoInclude.subscribe((newSetting) => editorPrefs.setItem('autoInclude', newSetting));

        this.editorParams = {
            annotations: SysGlobalObservables.editorAnnotations,
            autoIndent: autoIndent,
            highlightLine: highlightLine,
            showInvisibles: showInvisibles,
            autoInclude: autoInclude,
            theme: theme,
            fontSize: fontSize,
            keyboardShortcuts: []
        };
    }

    setCompilerParams() {
        this.compilerParams = {
            buildCmd: SysGlobalObservables.buildCmd,
            execCmd: SysGlobalObservables.execCmd,
            compileStatus: SysGlobalObservables.compileStatus,
            lastGccOutput: SysGlobalObservables.lastGccOutput,
            gccOptsError: SysGlobalObservables.gccOptsError,
            gccErrorCount: SysGlobalObservables.gccErrorCount,
            gccWarningCount: SysGlobalObservables.gccWarningCount
        };
    }

    setupCompileCallbacks() {
        const compileShortcut = {
            win: 'Ctrl-Return',
            mac: 'Command-Return'
        };

        const platform = (navigator.platform.match(/mac|win|linux/i) || ['other'])[0].toLowerCase(); // from ace editor
        const shortcut = platform === 'mac' ? compileShortcut.mac.replace('Command', '\u2318') : compileShortcut.win;
        this.compilerParams.compileBtnTooltip = `Compile and Run (${shortcut} in code editor)`;

        // the editor will set the value of this observable to a function which returns the editor text
        this.editorParams.editorTextGetter = ko.observable(() => '');

        const compile = () => {
            if (this.editorParams.autoInclude()) {
                this.autoIncluder.addMissingHeaders(this.editorParams.editorTextGetter);
            }
            const buildCmd = this.compilerParams.buildCmd();
            (SysGlobalObservables.runCode())(buildCmd);
        };

        this.compilerParams.compileCallback = compile;

        this.editorParams.keyboardShortcuts.push([
            'compileAndRunShortcut',
            compileShortcut,
            compile,
            true // the compile command should work in readOnly mode
        ]);
    }

    setVmParams() {
        this.vmParams = {
            vmState: SysGlobalObservables.vmState
        };
    }

    dispose() {
        // This runs when the component is torn down. Put here any logic necessary to clean up,
        // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
    }
}

export default { viewModel: PlayActivityPage, template: templateMarkup };
