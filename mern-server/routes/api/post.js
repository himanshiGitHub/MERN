const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const User = require('../../models/User');
const Profile = require('../../models/Profile');




router.post('/',
    [
        auth,
        [
            check('text', 'Text is required')
                .not()
                .isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        User.findById(req.user.id).select('-password')
            .then((user) => {
                const newPost = new Post({
                    text: req.body.text,
                    name: user.name,
                    avatar: user.avatar,
                    user: req.user.id
                });
                newPost.save();
                return res.json(newPost);
            })
            .catch((err) => {
                console.log('error', err);
                return res.status(500).send('Server error')
            })
    });

    router.get('/',auth, (req, res) => {
        Post.find().sort({date: -1})
            .then((post) => {
                return res.json(post);
            })
            .catch((err) => {
                console.log('error', err);
                return res.status(500).send('Server error')
            })
    });

    router.get('/:id',auth, (req, res) => {
        Post.findById(req.params.id)
            .then((post) => {
                if(!post) {
                    return res.status(404).json({msg: 'Post not found'});
                }
                return res.json(post);
            })
            .catch((err) => {
                if (err.name == 'CastError') {
                    res.status(400).json({ msg: 'Post Not Found!!' });
                }
                console.log('error', err);
                return res.status(500).send('Server error')
            })
    });


    router.delete('/:id',auth, (req, res) => {
        Post.findById(req.params.id)
            .then((post) => {
                if(!post) {
                    return res.status(404).json({msg: 'Post not found'});
                }
                if(post.user.toString() !== req.user.id) {
                    return res.status(401).json({msg:'User is not Authorized!'});
                }
                
                post.remove();
                return res.json({msg: 'Post removed'});
            })
            .catch((err) => {
                if (err.name == 'CastError') {
                    res.status(400).json({ msg: 'Post Not Found!!' });
                }
                console.log('error', err);
                return res.status(500).send('Server error')
            })
    });
module.exports = router;