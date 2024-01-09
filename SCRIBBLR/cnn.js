var CNN = function(main){
	// reference to the Main State
	this.main = main;
	
	this.NUM_CLASSES = App.DATASETS.length; // number of classes which can be recognized by CNN model
	
	this.IMAGE_SIZE = 784; // size of an image in a dataset
	
	this.NUM_TRAIN_IMAGES = 400; // number of training images in a dataset 
	this.NUM_TEST_IMAGES = 100; // number of test images in a dataset
	
	this.TRAIN_ITERATIONS = 50; // total number of training iterations
	this.TRAIN_BATCH_SIZE = 100; // number of training images used to train model during one iteration

	this.TEST_FREQUENCY = 5; // frequency of testing model accuracy 
	this.TEST_BATCH_SIZE = 50; // number of test images 
	
	this.trainIteration = 0; // current number of executed training iterations
	
	// total number of training images in all classes
	const TOTAL_TRAIN_IMAGES = this.NUM_CLASSES * this.NUM_TRAIN_IMAGES;
	
	// total number of test images in all classes
	const TOTAL_TEST_IMAGES = this.NUM_CLASSES * this.NUM_TEST_IMAGES;
	
	// create Training Data arrays for storing training images and their corresponding classes
	this.aTrainImages = new Float32Array(TOTAL_TRAIN_IMAGES * this.IMAGE_SIZE);
	this.aTrainClasses = new Uint8Array(TOTAL_TRAIN_IMAGES);
	
	// shuffle Training Data by creating an array of shuffled Train indices 
	this.aTrainIndices = tf.util.createShuffledIndices(TOTAL_TRAIN_IMAGES);
	
	// the reference to the current element in the aTrainIndices[] array
	this.trainElement = -1;
					
	// create arrays of Test Data for storing test images and their corresponding classes
	this.aTestImages = new Float32Array(TOTAL_TEST_IMAGES * this.IMAGE_SIZE);
	this.aTestClasses = new Uint8Array(TOTAL_TEST_IMAGES);
	
	// shuffle Test Data by creating an array of shuffled Test indices 
	this.aTestIndices = tf.util.createShuffledIndices(TOTAL_TEST_IMAGES);
	
	// the reference to the current element in the aTestIndices[] array
	this.testElement = -1;

	// a CNN model using a Sequential model 
	this.model = tf.sequential();

	// a convolutional layer
	this.model.add(tf.layers.conv2d({
		inputShape: [28, 28, 1],
		kernelSize: 5,
		filters: 8,
		strides: 1,
		activation: 'relu',
		kernelInitializer: 'varianceScaling'
	}));
	
	// a max pooling layer
	this.model.add(tf.layers.maxPooling2d({
		poolSize: [2, 2], 
		strides: [2, 2]
	}));
	
	// a second convolutional layer
	this.model.add(tf.layers.conv2d({
		kernelSize: 5,
		filters: 16,
		strides: 1,
		activation: 'relu',
		kernelInitializer: 'varianceScaling'
	}));
	
	// a second max pooling layer
	this.model.add(tf.layers.maxPooling2d({
		poolSize: [2, 2], 
		strides: [2, 2]
	}));
	
	// a flatten layer 
	this.model.add(tf.layers.flatten());
	
	// a dense layer 
	this.model.add(tf.layers.dense({
		units: this.NUM_CLASSES, 
		kernelInitializer: 'varianceScaling', 
		activation: 'softmax'
	}));
	
	// compile the model
	this.model.compile({
		optimizer: tf.train.sgd(0.15), // optimizer with learning rate
		loss: 'categoricalCrossentropy', // loss function
		metrics: ['accuracy'], // evaluation metric
	});
};


CNN.prototype.splitDataset = function(imagesBuffer, dataset){
	
	var trainBuffer = new Float32Array(imagesBuffer.slice(0, this.IMAGE_SIZE * this.NUM_TRAIN_IMAGES));
	trainBuffer = trainBuffer.map(function (cv){return cv/255.0});
	
	var start = dataset * this.NUM_TRAIN_IMAGES;
	this.aTrainImages.set(trainBuffer, start * this.IMAGE_SIZE);
	this.aTrainClasses.fill(dataset, start, start + this.NUM_TRAIN_IMAGES);
	
	var testBuffer = new Float32Array(imagesBuffer.slice(this.IMAGE_SIZE * this.NUM_TRAIN_IMAGES));
	testBuffer = testBuffer.map(function (cv){return cv/255.0});
	
	start = dataset * this.NUM_TEST_IMAGES;
	this.aTestImages.set(testBuffer, start * this.IMAGE_SIZE);
	this.aTestClasses.fill(dataset, start, start + this.NUM_TEST_IMAGES);
};


// Trains the model

CNN.prototype.train = async function(){
	this.isTrainCompleted = false;
						
	for (let i = 0; i < this.TRAIN_ITERATIONS; i++){
		this.trainIteration++;
		this.main.ui.showStatusBar("Training CNN - iteration " + this.trainIteration + ".");
		
		let trainBatch = this.nextTrainBatch(this.TRAIN_BATCH_SIZE);
		
		let testBatch;
		let validationSet;
				
		if (i % this.TEST_FREQUENCY === 0){	
			testBatch = this.nextTestBatch(this.TEST_BATCH_SIZE);
			
			validationSet = [testBatch.images, testBatch.labels];
		}
		
		// train the model
		const training = await this.model.fit(
			trainBatch.images,
			trainBatch.labels,
			{batchSize: this.TRAIN_BATCH_SIZE, validationData: validationSet, epochs: 1}
		);

		
	}
	
	// set the training flag to know the training is completed
	this.isTrainCompleted = true;
};


// Predicts a batch of sample images fetched from Test Data
	
CNN.prototype.predictSamples = async function(){
	this.isSamplesPredicted = false;

	const samplesBatch = this.nextTestBatch(App.NUM_SAMPLES);

	tf.tidy(() => {
		const output = this.model.predict(samplesBatch.images);
		
		const aClassifications = Array.from(samplesBatch.labels.argMax(1).dataSync());
		const aPredictions = Array.from(output.argMax(1).dataSync());
		
		this.main.ui.showSamplePredictions(aClassifications, aPredictions);
	});
	
	tf.dispose(samplesBatch);
	
	this.isSamplesPredicted = true;
};
	
// Predicts a drawing

CNN.prototype.predictDoodle = async function(aNormalizedPixels){		
	const input = tf.tensor2d(aNormalizedPixels, [1, this.IMAGE_SIZE]);
		
	tf.tidy(() => {
		const output = this.model.predict(
			input.reshape([1, 28, 28, 1])
		);
		
		const aPrediction = Array.from(output.argMax(1).dataSync());
		
		this.main.ui.showDoodlePrediction(aPrediction);
	});
	
	tf.dispose(input);
};


// Returns a batch of images and their corresponding classes from the Training Data

CNN.prototype.nextTrainBatch = function(batchSize){
	return this.fetchBatch(
		batchSize, this.aTrainImages, this.aTrainClasses, 
		() => {
			this.trainElement = (this.trainElement + 1) % this.aTrainIndices.length;
			return this.aTrainIndices[this.trainElement];
		}
	);
};

// Returns a batch of images and their corresponding classes from the Test Data

CNN.prototype.nextTestBatch = function(batchSize){
	return this.fetchBatch(
		batchSize, this.aTestImages, this.aTestClasses, 
		() => {
			this.testElement = (this.testElement + 1) % this.aTestIndices.length;
			return this.aTestIndices[this.testElement];
		}
	);
};

// Fetches a batch of images and their corresponding classes

CNN.prototype.fetchBatch = function(batchSize, aImages, aClasses, getIndex){
	// create batch arrays
	const batchImages = new Float32Array(batchSize * this.IMAGE_SIZE);
	const batchLabels = new Uint8Array(batchSize * this.NUM_CLASSES);

	for (let i = 0; i < batchSize; i++){
		const idx = getIndex();
		
		const image = aImages.slice(idx * this.IMAGE_SIZE, (idx + 1) * this.IMAGE_SIZE);
		
		batchImages.set(image, i * this.IMAGE_SIZE);

		const class_num = aClasses[idx];
		
		// generate the label for this image by using "one hot encoding method":
		const label = new Uint8Array(this.NUM_CLASSES);
		label[class_num] = 1;
		
		// add the label to the batch of labels
		batchLabels.set(label, i * this.NUM_CLASSES);
	}

	// convert batch of images to a temporary tensor
	const images_temp = tf.tensor2d(batchImages, [batchSize, this.IMAGE_SIZE]);
	
	// reshape the temporary tensor to the size of the model input shape
	const images = images_temp.reshape([batchSize, 28, 28, 1]);
	
	// dispose the temporary tensor to free memory
	images_temp.dispose();
	
	// convert batch of labels to tensor
	const labels = tf.tensor2d(batchLabels, [batchSize, this.NUM_CLASSES]);

	return {images, labels};
};