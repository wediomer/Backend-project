const express = require('express');
const db = require('./db');
const User = require('./module/user');
const Comment = require('./module/comment');
const Post = require('./module/Post');
const Blogpost = require('./module/blogpost');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');

const app = express();

// Set view engine and configure middleware
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(__dirname + '/public'));


// Configure session middleware
app.use(session({
  secret: 'cba321seid',
  resave: false,
  saveUninitialized: true
}));

// Middleware to require login for certain routes
const requireLogin = (req, res, next) => {
  if (req.session.loggedInUser) {
    next();
  } else {
    res.redirect('/login');
  }
};

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("User not found");
    }

    const isMatch =  bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Incorrect password!");
    }

    req.session.loggedInUser = user.id;
    res.redirect('/');
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    } else {
      res.redirect('/login');
    }
  });
});


app.get('/', requireLogin, (req, res) => {
  User.find()
    .then((users) => {
      Post.find()
        .populate({
          path: 'author',
          populate: {
            path: 'avatar',
          },
        })
        .populate({
          path: 'comments',
          populate: {
            path: 'author',
            populate: {
              path: 'avatar',
            },
          },
        })
        .then((posts) => {
          const userLoggedIn = true;
          res.render('homepage', { posts, req, users, userLoggedIn });
        })
        .catch((err) => {
          console.error('Error:', err);
          res.status(500).send('Internal Server Error');
        });
    })
    .catch((err) => {
      console.error('Error:', err);
      res.status(500).send('Internal Server Error');
    });
});

// Register route
app.get('/register', (req, res) => {
  res.render('register');
});

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const public = multer({ storage: storage });

// Register POST route
app.post('/register', public.single('avatar'), async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      avatar: `/public/${req.file.filename}`, // Store the filename of the avatar image
    });

    await newUser.save();
    res.redirect('/login');
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Edit blog post route (GET)
app.get('/editBlog/:id', (req, res) => {
  const postId = req.params.id;

  // Fetch the post from the database based on the postId
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        res.status(404).send('Post not found');
        return;
      }

      // Check if the logged-in user is the author of the post
      if (req.session.loggedInUser !== post.author.toString()) {
        res.status(403).render('Auth')
        return;
      }

      // Render the edit form or page with the post data
      res.render('editBlog', { post });
    })
    .catch((error) => {
      console.error('Error retrieving post:', error);
      res.status(500).send('Internal Server Error');
    });
});

 




app.post('/createBlog', requireLogin, public.single('avatar'), (req, res) => {
  const { title, content } = req.body;
  const newPost = new Post({
    title,
    content,
    author: req.session.loggedInUser,
    avatar: req.file ? `/public/${req.file.filename}` : null, // Store the path to the uploaded avatar image
  });
  newPost.save()
    .then(() => {
      res.redirect('/');
    })
    .catch((error) => {
      console.error('Error saving Post:', error);
      res.status(500).send('Internal Server Error');
    });
});



app.post('/editBlog/:id', (req, res) => {
  if (!req.session.loggedInUser) {
    res.render('Auth');
    return;
  }

  const postId = req.params.id;
  const { title, content, avatar } = req.body;

  Post.findById(postId)
    .then((post) => {
      // Check if the post exists and if the logged-in user is the author of the post
      if (!post || req.session.loggedInUser !== post.author.toString()) {
        res.render('Auth')
        return;
      }

      Post.findByIdAndUpdate(postId, { $set: { title, content, avatar } }, { new: true, runValidators: true })
        .then((updatedPost) => {
          res.redirect('/');
        })
        .catch((error) => {
          console.error('Error updating post:', error);
          res.status(500).send('Internal Server Error');
        });
    })
    .catch((error) => {
      console.error('Error retrieving post:', error);
      res.status(500).send('Internal Server Error');
    });
});


app.get('/Auth', (req, res)=>{
  res.render('Auth');
})
app.put('/editBlog/:id', (req, res) => {
  if (!req.session.loggedInUser) {
    res.render('Auth');;
    return;
  }

  const postId = req.params.id;

  Post.findById(postId)
    .then((post) => {
      // Check if the post exists and if the logged-in user is the author of the post
      if (!post || req.session.loggedInUser !== post.author.toString()) {
        res.render('Auth');
        return;
      }

      const updatedPost = req.body;

      Post.findByIdAndUpdate(postId, updatedPost)
        .then(() => {
          res.redirect('/post/' + postId);
        })
        .catch((error) => {
          console.error('Error updating post:', error);
          res.status(500).send('Internal Server Error');
        });
    })
    .catch((error) => {
      console.error('Error retrieving post:', error);
      res.status(500).send('Internal Server Error');
    });
});


// Route for rendering the view for commenting on a post
app.get('/commentPost/:id', requireLogin, async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId)
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'avatar username'
        }
      });

    if (!post) {
      return res.status(404).send('Post not found');
    }

    res.render('Post', { post });
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});


// Route for handling the submission of a new comment
app.post('/commentPost/:id', requireLogin, public.single('avatar'), async (req, res) => {
  try {
    const postId = db.Types.ObjectId(req.params.id);
    const commentContent = req.body.content;
    const authorId = req.body.userId;

    const comment = new Comment({
      content: commentContent,
      author: authorId,
      // avatar: avatarPath
    });

    const savedComment = await comment.save();

    const populatedComment = await Comment.populate(savedComment, {
      path: 'author',
    });

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { comments: populatedComment._id } },
      { new: true }
    )
      .populate('author')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'avatar username',
        },
      })
      .exec();

    if (!updatedPost) {
      return res.status(404).send('Post not found');
    }

    res.redirect(`/post/${postId}`);
  } catch (error) {
    return res.status(500).send('Error saving comment');
  }
});



    app.get('/createBlog', (req, res) => {
      res.render('createBlog');
    });
    
    
    app.get('/Post', (req, res) => {
      Post.find()
        .then(posts => {
          res.render('Post', { posts: posts });
        })
        .catch(error => {
          console.error('Error:', error);
        });
    })

    app.get('/post/:id', async (req, res) => {
      const postId = req.params.id;
    
      try {
        const post = await Post.findById(postId)
          .populate('comments');
        
        res.render('post', { post: post });
      } catch (error) {
        console.error('Error retrieving post:', error);
        res.status(500).send('Internal Server Error');
      }
    });
    
  
    
    app.post('/deletePost/:id', async (req, res) => {
      if (!req.session.loggedInUser) {
        res.render('Auth');
        return;
      }
    
      const postId = req.params.id;
    
      try {
        const post = await Post.findById(postId);
    
        if (!post || post.author.toString() !== req.session.loggedInUser) {
          res.render('Auth');
          return;
        }
    
        await Post.findByIdAndDelete(postId);
        res.redirect('/createBlog');
      } catch (error) {
        console.error(error);
        res.render('Error', { error: 'An error occurred while deleting the post' });
      }
    });
    
    
    
    app.post('/comments/:id', async (req, res) => {
      try {
        // Retrieve the comment data from the request body
        const { content } = req.body;
        const postId = req.params.id;
    
        // Get the authenticated user's information from the session
        const authorIdd = req.session.loggedInUser;
        const author = await User.findOne({ _id: authorIdd }).populate('username');
       
        // Create a new instance of the Comment model with the provided data
        const comment = new Comment({
          postId,
          content,
          author:author.username,
        });
    
        // Save the comment to the database
        const savedComment = await comment.save();
    
        // Return the saved comment as the response
        // res.json(savedComment);
        res.render('postComment');
        
        
      } catch (error) {
        // If an error occurs, return an error response with the error message
        res.status(500).json({ error: error.message });
      }
      
    });


    app.get('/comments/:id', async (req, res) => {
      try {
        const postId = req.params.id;
        const comments = await Comment.find({ postId: postId });
        const post = await Post.findById(postId);
    
        res.render('comments', { postId, comments, post });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
   
    
    






    app.get('/forgotPassword', (req, res) => {
      res.render('forgotPassword');
    });
    // Function to generate a random temporary password
    function generateTemporaryPassword() {
      const length = 8; // Set the desired length of the temporary password
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let temporaryPassword = '';
    
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        temporaryPassword += characters.charAt(randomIndex);
      }
    
      return temporaryPassword;
    }
    
    // Function to send a password reset email
    function sendPasswordResetEmail(email, resetToken) {
     
      console.log(`Sending password reset email to ${email} with token ${resetToken}`);
    }
    
    app.post('/reset-password', async (req, res) => {
      const { email } = req.body;
    
      try {
        // Generate a temporary password or a password reset token
        const temporaryPassword = generateTemporaryPassword();
    
        // Update the user's password or store the password reset token in the database
        const user = await User.findOneAndUpdate({ email }, { passwordResetToken: temporaryPassword });
        if (!user) {
          
          return res.status(404).send("User not found");
        }
    
        // Send a password reset email with the temporary password or the password reset token
        sendPasswordResetEmail(user.email, temporaryPassword); 
    
        // Redirect the user to a successful reset password page 
        res.redirect('/passwordResetSuccess');
      } catch (error) {
        console.error("Error resetting password:", error);
        res.status(500).send("Internal Server Error");
      }
    });
    
    app.get('/passwordResetSuccess', (req, res) => {
      res.render('passwordResetSuccess');
    });
    

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
