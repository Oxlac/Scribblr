var UI = function(main){
	
	this.main = main;
	
	var game = this.main.game;
	
	// create buttons
	this.btnTrain = game.add.button(550, 590, 'btnTrain', this.onTrainClick, this);
	this.btnTest = game.add.button(750, 590, 'btnTest', this.onTestClick, this);
	this.btnClear = game.add.button(950, 590, 'btnClear', this.onClearClick, this);
	
	this.btnAuthor = game.add.button(1130, 703, 'btnAuthor', this.onMoreGamesClick, this);
	this.btnAuthor.anchor.setTo(0.5);
	
	
	// create a bitmap for showing all sample images for predicting by CNN
	this.bmpSampleImages = game.add.bitmapData(28, (28+4) * App.NUM_SAMPLES);
	this.bmpSampleImages.addToWorld(100, 95);
		
	// create a bitmap for drawing green/red rectangles as results of CNN predictions 
	this.bmpSampleResults = game.add.bitmapData(125, (28+4) * App.NUM_SAMPLES);
	this.bmpSampleResults.addToWorld(285, 95);
		
	// create text objects
	this.txtSampleClasses = [];	// correct classes of samples
	this.txtSamplePredictions = [];	// predictions for samples
		
	for (var i=0; i<App.NUM_SAMPLES; i++){
		var y = 100 + i*32;
			
		this.txtSampleClasses.push(
			game.add.bitmapText(300, y, "fntBlackChars", "", 18)
		);
		
		this.txtSamplePredictions.push(
			game.add.bitmapText(200, y, "fntBlackChars", "", 18)
		);
	}
		
	// create a text which shows messages in the status bar
	this.txtStatBar = game.add.bitmapText(10, 695, "fntBlackChars", "", 18);
	
	// create a text which shows CNN prediction for the doodle drawing
	this.txtDoodlePrediction = game.add.bitmapText(800, 572, "fntBlackChars", "", 36);
	this.txtDoodlePrediction.anchor.setTo(0.5);
};


//Disables buttons.

UI.prototype.disableButtons = function(){
	this.btnTrain.kill();
	this.btnTest.kill();
	this.btnClear.kill();
};


// Enables buttons.

UI.prototype.enableButtons = function(){
	this.btnTrain.revive();
	this.btnTest.revive();
	this.btnClear.revive();
};

// "Train More" button.
 
UI.prototype.onTrainClick = function(){
	if (this.main.mode == this.main.MODE_DRAW){
		this.main.mode = this.main.MODE_CLICK_ON_TRAIN;
	}
};

// "Next Test" button.
  
UI.prototype.onTestClick = function(){
	if (this.main.mode == this.main.MODE_DRAW){
		this.main.mode = this.main.MODE_CLICK_ON_TEST;
	}
};

// "Clear" button.
 
UI.prototype.onClearClick = function(){
	if (this.main.mode == this.main.MODE_DRAW){
		this.main.mode = this.main.MODE_CLICK_ON_CLEAR;
	}
};


// Opens Official OXLAC Website

UI.prototype.onMoreGamesClick = function(){
	window.open("http://www.oxlac.com", "_blank");
};


// Draws all sample images intended for CNN prediction.

UI.prototype.drawSampleImages = function(){
	// clear the bitmap 
	this.bmpSampleImages.clear();
	
	// get the reference to the first sample
	var sample = this.main.cnn.testElement;
	
	// for all samples...
	for (var n = 0; n < App.NUM_SAMPLES; n++){
		// get the reference to the next sample
		sample = (sample + 1) % this.main.cnn.aTestIndices.length;
		
		// get the starting position of the first pixel of this sample
		var index = this.main.cnn.aTestIndices[sample];
		var start = index * this.main.cnn.IMAGE_SIZE;
	
		// for all pixels of this sample...
		for (var i = 0; i < this.main.cnn.IMAGE_SIZE; i++){
			// get the color of the current pixel
			var pixel = this.main.cnn.aTestImages[i + start];
			var color = 255 - ((pixel * 255)>>0) & 0xFF;
			
			// calculate XY position of this pixel on the bitmap
			var x = i%28;
			var y = (i/28)>>0;						
			
			// set this pixel on the bitmap
			this.bmpSampleImages.setPixel32(x, y + n*32, color, color, color, 255, false);
		}
	}
	
	// put the image data of the bitmap on the context to show all samples
	this.bmpSampleImages.context.putImageData(this.bmpSampleImages.imageData, 0, 0);
};

// Shows correct classifications for all sample images with their predictions displayed inside green/red rectangle.

UI.prototype.showSamplePredictions = function(aClassifications, aPredictions){
	this.bmpSampleResults.clear();
			
	for (var i=0; i<aClassifications.length; i++){
		// set the text of correct class of this sample
		this.txtSampleClasses[i].text = App.DATASETS[aClassifications[i]];
		
		// set the text of predicted class of this sample
		this.txtSamplePredictions[i].text = App.DATASETS[aPredictions[i]];
				
		// if (classification = prediction) then draw green rectangle else draw red rectangle
		var color = (this.txtSampleClasses[i].text === this.txtSamplePredictions[i].text) ? '#61bc6d' : '#e24939';
		this.bmpSampleResults.rect(0, 2 + i*32, this.bmpSampleResults.width, 24, color);
	}
};


// Shows a prediction for the doodle drawing.

UI.prototype.showDoodlePrediction = function(aPredictions){
	this.txtDoodlePrediction.text = "It's "  + App.DATASETS[aPredictions[0]] + "!";
};

// Shows a message in the status bar.

UI.prototype.showStatusBar = function(strText){
	this.txtStatBar.text = strText;
};
