describe('friendly', function() {
  var friendly = require('../src/friendly');
  var PostSchema;

  afterEach(cleanup);

  beforeEach(function() {
    PostSchema = new mongoose.Schema({ title: String });
  });

  it('errors out if the default source attribute is not present', function() {
    assert.throws(function() { new mongoose.Schema().plugin(friendly);
    }, Error, /does not have an attribute called "title"/);
  });

  it('errors out if the given source attribute is not present', function() {
    assert.throws(function() { new mongoose.Schema().plugin(friendly, { source: 'name' });
    }, Error, /does not have an attribute called "name"/);
  });

  it('adds the default attribute for the friendly value', function() {
    PostSchema.plugin(friendly);
    assert.property(PostSchema.paths, 'slug');
    assert.equal(PostSchema.paths['slug'].instance, 'String');
  });

  it('sets the given friendly attribute', function() {
    PostSchema.plugin(friendly, { friendly: 'friendly' });
    assert.property(PostSchema.paths, 'friendly');
  });

  it('indexes the friendly attribute by default', function() {
    PostSchema.plugin(friendly);
    assert.deepEqual(PostSchema.paths['slug']._index, { unique: true });
  });

  it('does not index the friendly attribute if set to', function() {
    PostSchema.plugin(friendly, { addIndex: false });
    assert.isNull(PostSchema.paths['slug']._index);
  });

  it('adds a findByFriendly static function', function() {
    PostSchema.plugin(friendly);
    assert.isFunction(PostSchema.statics.findByFriendly);
  });

  it('points findById to findByFriendly by default', function() {
    PostSchema.plugin(friendly);
    assert.equal(PostSchema.statics.findById, PostSchema.statics.findByFriendly);
  });

  it('does not point findById to findByFriendly if set to', function() {
    PostSchema.plugin(friendly, { findById: false });
    assert.isUndefined(PostSchema.statics.findById);
  });

  context('when connected', function() {
    var Post;
    beforeEach(function () {
      PostSchema.plugin(friendly);
      Post = mongoose.model('Post', PostSchema);
    });
    afterEach(function() { mongoose.models = {}; });

    it('allows a deep attribute as the source', function(done) {
      var I18NPostSchema = new mongoose.Schema({ title: { en_US: String, pt_BR: String } });
      I18NPostSchema.plugin(friendly, { source: 'title.pt_BR' });
      var I18NPost = mongoose.model('I18NPost', I18NPostSchema);
      new I18NPost({ title: { en_US: 'My Title', pt_BR: 'Meu Titulo' } }).save(function(error, post) {
        assert.equal(post.slug, 'meu-titulo');
        done(error);
      });
    });

    it('sets the friendly attribute when not present', function(done) {
      new Post({ title: ' This is my first post! ' }).save(function(error, post) {
        assert.equal(post.slug, 'this-is-my-first-post');
        done(error);
      });
    });


    it('does not set the friendly attribute when already present', function(done) {
      new Post({ title: 'Any', slug: 'my-slug' }).save(function(error, post) {
        assert.equal(post.slug, 'my-slug');
        done(error);
      });
    });

    it('does not recreate the friendly attribute when saving an existing model', function(done) {
      new Post({ title: 'It should remain the same.' }).save(function(error, existing) {
        existing.title = 'Now I changed it...';
        existing.save(function(error, saved) {
          assert.equal(saved.slug, 'it-should-remain-the-same');
          done();
        });
      });
    });

    it('options.update generates auto slug even if force attempted', function(done) {
      UpdateSchema = new mongoose.Schema({ title: String });
      UpdateSchema.plugin(friendly, { update: true });
      var Update = mongoose.model('Update', UpdateSchema);

      new Update({ title: 'Any', slug: 'my-slug' }).save(function(error, update) {
        assert.equal(update.slug, 'any');
        done(error);
      });
    });

    it('force updates slug when options.update is true', function(done) {
      UpdateSchema = new mongoose.Schema({ title: String });
      UpdateSchema.plugin(friendly, { update: true });
      var Update = mongoose.model('Update', UpdateSchema);

      new Update({ title: 'It should remain the same.' }).save(function(error, existing) {
        existing.title = 'Now I changed it...';
        existing.save(function(error, saved) {
          assert.equal(saved.slug, 'now-i-changed-it');
          done();
        });
      });
    });

    it('ensures the uniqueness of the friendly attribute value', function(done) {
      async.timesSeries(112, function(n, next) {
        new Post({ title: 'This should be UNIQUE!' }).save(next);
      }, function(error, posts) {
        if (error) return done(error);
        assert.equal(posts[0].slug, 'this-should-be-unique');
        assert.equal(posts[1].slug, 'this-should-be-unique-1');
        assert.equal(posts[2].slug, 'this-should-be-unique-2');
        //...
        assert.equal(posts[10].slug, 'this-should-be-unique-10');
        assert.equal(posts[11].slug, 'this-should-be-unique-11');
        assert.equal(posts[12].slug, 'this-should-be-unique-12');
        //...
        assert.equal(posts[20].slug, 'this-should-be-unique-20');
        assert.equal(posts[21].slug, 'this-should-be-unique-21');
        assert.equal(posts[22].slug, 'this-should-be-unique-22');
        //...
        assert.equal(posts[100].slug, 'this-should-be-unique-100');
        assert.equal(posts[101].slug, 'this-should-be-unique-101');
        assert.equal(posts[102].slug, 'this-should-be-unique-102');
        //...
        assert.equal(posts[110].slug, 'this-should-be-unique-110');
        assert.equal(posts[111].slug, 'this-should-be-unique-111');
        done();
      });
    });

    it('finds by friendly', function(done) {
      new Post({ title: 'This is my 1st. post!!' }).save(function(error, post) {
        Post.findByFriendly('this-is-my-1st-post', function(error, found) {
          assert.equal(found._id.toString(), post._id.toString());
          done();
        });
      });
    });

    it('finds by id', function(done) {
      new Post({ title: 'This is my 1st. post!!' }).save(function(error, post) {
        Post.findById(post._id, function(error, found) {
          assert.equal(found._id.toString(), post._id.toString());
          done();
        });
      });
    });
  });
});
