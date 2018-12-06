import { Meteor } from 'meteor/meteor';
import { assert } from 'meteor/practicalmeteor:chai';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';


const plainMethod = new ValidatedMethod({
  name: 'plainMethod',
  validate: new SimpleSchema({}).validator(),
  run() {
    return 'result';
  }
});

const noArgsMethod = new ValidatedMethod({
  name: 'noArgsMethod',
  validate: null,
  run() {
    return 'result';
  }
});

const methodWithArgs = new ValidatedMethod({
  name: 'methodWithArgs',
  validate: new SimpleSchema({
    int: { type: Number },
    string: { type: String },
  }).validator(),
  run() {
    return 'result';
  }
});

const methodThrowsImmediately = new ValidatedMethod({
  name: 'methodThrowsImmediately',
  validate: null,
  run() {
    throw new Meteor.Error('error');
  }
});

const methodReturnsName = new ValidatedMethod({
  name: 'methodReturnsName',
  validate: null,
  run() {
    return this.name;
  }
});

const methodWithSchemaMixin = new ValidatedMethod({
  name: 'methodWithSchemaMixin',
  mixins: [schemaMixin],
  schema: new SimpleSchema({
    int: { type: Number },
    string: { type: String },
  }),
  run() {
    return 'result';
  }
});

let resultReceived = false;
const methodWithApplyOptions = new ValidatedMethod({
  name: 'methodWithApplyOptions',
  validate: new SimpleSchema({}).validator(),
  applyOptions: {
    onResultReceived: function() {
      resultReceived = true;
    }
  },
  run() {
    return 'result';
  }
});

function schemaMixin(methodOptions) {
  methodOptions.validate = methodOptions.schema.validator();
  return methodOptions;
}

describe('mdg:method', () => {
  it('defines a method that can be called', (done) => {
    plainMethod.call({}, (error, result) => {
      assert.equal(result, 'result');

      Meteor.call(plainMethod.name, {}, (error, result) => {
        assert.equal(result, 'result');
        done();
      });
    });
  });

  it('allows methods that take no arguments', (done) => {
    noArgsMethod.call((error, result) => {
      assert.equal(result, 'result');

      Meteor.call(noArgsMethod.name, (error, result) => {
        assert.equal(result, 'result');
        done();
      });
    });
  });


  [methodWithArgs, methodWithSchemaMixin].forEach((method) => {
    it('checks schema ' + method.name, (done) => {
      method.call({}, (error, result) => {
        // 2 invalid fields
        assert.equal(error.errors.length, 2);

        method.call({
          int: 5,
          string: "what",
        }, (error, result) => {
          // All good!
          assert.equal(result, 'result');

          done();
        });
      });
    });
  });

  it('throws error if no callback passed', (done) => {
    methodThrowsImmediately.call({}, (err) => {
      // If you pass a callback, you get the error in the callback
      assert.ok(err);

      // If no callback, the error is thrown
      assert.throws(() => {
        methodThrowsImmediately.call({});
      }, /error/);

      done();
    });
  });

  it('throws error if a mixin does not return the options object', () => {
    assert.throws(() => {
      new ValidatedMethod({
        name: 'methodWithFaultySchemaMixin',
        mixins: [function nonReturningFunction() {}],
        schema: null,
        run() {
          return 'result';
        }
      });
    }, /Error in methodWithFaultySchemaMixin method: The function 'nonReturningFunction' didn't return the options object/);

    assert.throws(() => {
      new ValidatedMethod({
        name: 'methodWithFaultySchemaMixin',
        mixins: [args => args, function () {}],
        schema: null,
        run() {
          return 'result';
        }
      });
    }, /Error in methodWithFaultySchemaMixin method: One of the mixins didn't return the options object/);
  });

  it('has access to the name on this.name', (done) => {
    const ret = methodReturnsName._execute();
    assert.equal(ret, 'methodReturnsName');

    methodReturnsName.call({}, (err, res) => {
      // The Method knows its own name
      assert.equal(res, 'methodReturnsName');

      done();
    });
  });

  it('can accept Meteor.apply options', (done) => {
    if (Meteor.isServer) {
      // the only apply option that I can think of to test is client side only
      return done();
    }

    resultReceived = false;
    methodWithApplyOptions.call({}, (err, res) => {
      // The Method knows its own name
      assert.equal(resultReceived, true);

      done();
    });
  });
});
