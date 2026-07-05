export class NeuralNet {
  weights1: Float32Array;
  biases1: Float32Array;
  weights2: Float32Array;
  biases2: Float32Array;

  constructor() {
    this.weights1 = new Float32Array(37 * 24).map(() => Math.random() * 2 - 1);
    this.biases1 = new Float32Array(24).map(() => Math.random() * 2 - 1);
    this.weights2 = new Float32Array(24 * 3).map(() => Math.random() * 2 - 1);
    this.biases2 = new Float32Array(3).map(() => Math.random() * 2 - 1);
  }

  clone() {
    let n = new NeuralNet();
    n.weights1.set(this.weights1);
    n.biases1.set(this.biases1);
    n.weights2.set(this.weights2);
    n.biases2.set(this.biases2);
    return n;
  }

  mutate(rate = 0.1, amount = 0.5) {
    const mutateArray = (arr: Float32Array) => {
      for(let i=0; i<arr.length; i++) {
        if (Math.random() < rate) arr[i] += (Math.random() * 2 - 1) * amount;
      }
    }
    mutateArray(this.weights1);
    mutateArray(this.biases1);
    mutateArray(this.weights2);
    mutateArray(this.biases2);
  }

  predict(inputs: number[]) {
    let h = new Float32Array(24);
    for(let i=0; i<24; i++) {
      let sum = this.biases1[i];
      for(let j=0; j<37; j++) {
        sum += inputs[j] * this.weights1[j * 24 + i];
      }
      h[i] = Math.tanh(sum);
    }
    let o = new Float32Array(3);
    for(let i=0; i<3; i++) {
      let sum = this.biases2[i];
      for(let j=0; j<24; j++) {
        sum += h[j] * this.weights2[j * 3 + i];
      }
      o[i] = Math.tanh(sum);
    }
    return o;
  }
}

