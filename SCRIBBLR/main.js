window.onload = function () {	
	var game = new Phaser.Game(1280, 720, Phaser.CANVAS);
	
	game.state.add('MainState', App.MainState);
	
	game.state.start('MainState');
};

var App = App || {};

App.DATASETS = ['bee', 'octopus', 'tree', 'candle', 'clock', 'guitar', 'umbrella'];

App.NUM_SAMPLES = 16;

App.MainState = function(){
	this.MODE_INIT = 1;
	this.MODE_OPEN_FILE = 2;
	this.MODE_LOAD_FILE = 3;
	this.MODE_START_TRAIN = 4;
	this.MODE_DO_TRAIN = 5;
	this.MODE_START_PREDICT = 6;
	this.MODE_DO_PREDICT = 7;
	this.MODE_DRAW = 8;
	this.MODE_CLICK_ON_TRAIN = 9;
	this.MODE_CLICK_ON_TEST = 10;
	this.MODE_CLICK_ON_CLEAR = 11;
	
	this.mode = this.MODE_INIT;
	
	this.dataset = 0;
};

App.MainState.prototype = {
	
	preload : function(){
		this.game.load.image('imgBack', '../assets/img_back.png');
		this.game.load.image('imgDisable', '../assets/img_disable.png');
		
		this.game.load.image('btnTrain', '../assets/btn_train.png');
		this.game.load.image('btnTest', '../assets/btn_test.png');
		this.game.load.image('btnClear', '../assets/btn_clear.png');
		this.game.load.image('btnAuthor', '../assets/btn_author.png');
		
		this.load.bitmapFont('fntBlackChars', '../assets/fnt_black_chars.png', '../assets/fnt_black_chars.fnt');
	},
	
	
	create : function(){
		this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
		this.scale.pageAlignVertically = true;
		this.scale.pageAlignHorizontally = true;
		
		this.game.stage.disableVisibilityChange = true;

		// background
		this.game.add.sprite(0, 0, 'imgBack');
		
		// loader for loading datasets
		this.loader = new Phaser.Loader(this.game);
		
		// user interface with buttons, bitmaps and texts
		this.ui = new UI(this);
		
		// a convolution neural network
		this.cnn = new CNN(this);
		
		// a painter for drawing doodles
		this.painter = new Painter(this);
	},
	
	
	update : function(){
		switch(this.mode){
			// initializing the game
			case this.MODE_INIT:
				this.painter.reset();
				this.painter.disable();
				this.ui.disableButtons();
				
				this.mode = this.MODE_OPEN_FILE;
				break;
				
			// opening dataset file and start loading it
			case this.MODE_OPEN_FILE:
				var fileName = App.DATASETS[this.dataset] + '.bin';
				
				this.loader.reset();
				this.loader.binary('input_file', '../data/'+fileName);
				this.loader.start();
				
				this.ui.showStatusBar("Loading " + fileName + " file.");

				this.mode = this.MODE_LOAD_FILE;
				break;
				
			// waiting on dataset file to be loaded
			case this.MODE_LOAD_FILE:		
				if (this.loader.hasLoaded){
					// spliting the loaded dataset into training data and test data
					this.cnn.splitDataset(
						new Uint8Array(this.game.cache.getBinary('input_file')),
						this.dataset
					);
					
					// increasing the number of loaded datasets
					this.dataset++;
					

					if (this.dataset < App.DATASETS.length){
						this.mode = this.MODE_OPEN_FILE;
						
					} else {
						this.ui.showStatusBar("Initializing training.");
						this.mode = this.MODE_START_TRAIN;
					}
				}
				break;

			//  CNN training
			case this.MODE_START_TRAIN:
				this.painter.disable();
				this.ui.disableButtons();
					
				this.cnn.train();
				
				this.mode = this.MODE_DO_TRAIN;				
				break;
				
			// wait for completion of the CNN training
			case this.MODE_DO_TRAIN:
				if (this.cnn.isTrainCompleted){
					this.ui.showStatusBar("Training completed. Predicting samples...");
					
					this.mode = this.MODE_START_PREDICT;
				}
				break;
				
			// draw sample images and start with predicting them by using CNN
			case this.MODE_START_PREDICT:
				this.ui.drawSampleImages();
				this.cnn.predictSamples();
				
				this.mode = this.MODE_DO_PREDICT;
				break;
				
			// wait for CNN to make predictions for all samples
			case this.MODE_DO_PREDICT:
				if (this.cnn.isSamplesPredicted){
					this.painter.enable();
					this.ui.enableButtons();
					
					this.ui.showStatusBar(
						"Draw " + App.DATASETS.join(", ") + 
						" !"
					);
					
					this.mode = this.MODE_DRAW;
				}
				break;
				
			// draw a doodle and recognize it by using CNN
			case this.MODE_DRAW:
				if (this.game.input.mousePointer.isDown){
					this.painter.draw(this.game.input.x, this.game.input.y);
					
				} else {
					this.painter.recognize();
				}

				break;
				
			// actions on clicking "Train More" button
			case this.MODE_CLICK_ON_TRAIN:
				this.mode = this.MODE_START_TRAIN;
				break;
			
			// actions on clicking "Next Test" button
			case this.MODE_CLICK_ON_TEST:
				this.mode = this.MODE_START_PREDICT;
				break;

			
			case this.MODE_DRAW:
				if (this.game.input.mousePointer.isDown){
					this.painter.draw(this.game.input.x, this.game.input.y);
						
				} else {
					this.painter.recognize();
				}
	
				break;
				
			// actions on clicking "Clear" button
			case this.MODE_CLICK_ON_CLEAR:
				this.painter.reset();
				this.ui.txtDoodlePrediction.setText("");
				
				this.mode = this.MODE_DRAW;
				break;
		}
	}
};
