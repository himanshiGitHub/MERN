const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const mongoose = require('mongoose');
const request = require('request');
const config = require('config');
const axios = require('axios');


const normalize = require('normalize-url');

router.get('/me', auth, (req, res) => {
    try {
        Profile.findOne({ user: req.user.id }).populate('user',
            ['name', 'avatar'])
            .then((profile) => {
                if (!profile) {
                    return res.status(400).json({ msg: 'There is no profile for user' });
                }
                res.json(profile);
            })

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});


router.post(
    '/',
    [
        auth,
        [
            check('status', 'Status is required')
                .not()
                .isEmpty(),
            check('skills', 'Skills is required')
                .not()
                .isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const {
            company,
            location,
            website,
            bio,
            skills,
            status,
            githubusername,
            youtube,
            twitter,
            instagram,
            linkedin,
            facebook
        } = req.body;

        const profileFields = {
            user: req.user.id,
            company,
            location,
            website: website === '' ? '' : normalize(website, { forceHttps: true }),
            bio,
            skills: Array.isArray(skills)
                ? skills
                : skills.split(',').map(skill => '' + skill.trim()),
            status,
            githubusername
        };

        // Build social object and add to profileFields
        const socialfields = { youtube, twitter, instagram, linkedin, facebook };

        for (const [key, value] of Object.entries(socialfields)) {
            if (value)
                socialfields[key] = normalize(value, { forceHttps: true });
        }
        profileFields.social = socialfields;

        Profile.findOne(
            { user: req.user.id }
        )
            .then((profile) => {
                if (profile) {
                    Profile.deleteOne({ user: req.user.id })
                        .then((res) => {
                            const profileUser = new Profile(profileFields);
                            profileUser.save();
                            return profileUser;
                        })
                        .catch((err) => {
                            return err;
                        })
                } else {
                    const profileUser = new Profile(profileFields);
                    profileUser.save();
                }

                return profile;


            })
            .then((profile) => {
                return res.json(profileFields);

            })
            .catch((err) => {
                console.error(err, 'erererrer');
                return res.status(500).send('Server Error');
            })
    }
);

router.get('/', (req, res) => {
    Profile.find().populate('user', ['name', 'avatar'])
        .then((user) => {
            return res.json(user);
        })
        .catch((err) => {
            console.log(err, 'errrrrrrrrrrrr');
            return res.status(500).send('Server error')

        })
})

router.get('/user/:userId', (req, res) => {
    Profile.findOne({ user: req.params.userId }).populate('user', ['name', 'avatar'])
        .then((user) => {
            if (!user) return res.status(400).json({ msg: 'There is no profile for this user' });
            return res.json(user);
        })
        .catch((err) => {
            if (err.name == 'CastError') {
                res.status(400).json({ msg: 'PROFILE NOT FOUND' });
            }
            console.log(err, 'errrrrrrrrrrrr')
            return res.status(500).send('Server error')
        })
})

router.delete('/',auth, (req, res) => {
      //remove profile
    Profile.findOneAndRemove({ user: req.user.id })
        .then((profileremoved) => {
            //remove user
            User.findByIdAndRemove({_id:req.user.id})
            .then((userDeleted) => {

                if(!userDeleted) {
                    return res.status(400).json({ msg: 'PROFILE NOT FOUND' });
                } else {
                    return res.json({msg: 'User deleted!'});
                }
                
            })
            .catch((err) => {
                console.log(err, 'errrrrrrrrrrrr')
                return res.status(500).send('Server error')
            })
        })
        .catch((err) => {
            console.log(err, 'errrrrrrrrrrrr')
            return res.status(500).send('Server error')
        })
})


router.put('/experience', [auth,[  
    check('title', 'Title is required')
    .not()
    .isEmpty(),
  check('company', 'Company is required')
    .not()
    .isEmpty(),
  check('from', 'From date is required and needs to be from the past')
    .not()
    .isEmpty()
    .custom((value, { req }) => (req.body.to ? value < req.body.to : true))
]], (req,res) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array() });
    }
    const {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    } = req.body;
    const newExp = {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    };
    Profile.findOne({user: req.user.id})
    .then((profile) => {
        profile.experience.unshift(newExp);
        profile.save()
        .then((saveprofile) => {
            return res.json(saveprofile);
        })
        .catch((err) => {
            console.log('error', err);
            return res.status(500).send('Server error')
        })
    })
    .catch((err) => {
        console.log('error', err);
        return res.status(500).send('Server error')
    })
})


router.delete('/experience/:exp_id', auth, (req, res) => {
    Profile.findOne({user: req.user.id})
    .then((profile) => {
        // Get removed index 
        const removedIndex = profile.experience.map(item => item.id)
        .indexOf(req.params.exp_id);
        profile.experience.splice(removedIndex, 1);
        profile.save();
        return profile;
    })
    .then((updatedProfile) => {
        return res.json(updatedProfile);
    })
    .catch((err) => {
        console.log('error', err);
        return res.status(500).send('Server error')
    })
})

router.put('/education', [auth,[  
    check('school', 'School is required')
    .not()
    .isEmpty(),
  check('degree', 'Degree is required')
    .not()
    .isEmpty(),
  check('from', 'From is required')
    .not()
    .isEmpty(),  
  check('fieldofstudy', 'Field of study is required.')
    .not()
    .isEmpty()
]], (req,res) =>{
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array() });
    }
    const {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
    } = req.body;
    const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
    };
    Profile.findOne({user: req.user.id})
    .then((profile) => {
        profile.education.unshift(newEdu);
        profile.save()
        .then((savedprofile) => {
            return res.json(savedprofile);
        })
        .catch((err) => {
            console.log('error', err);
            return res.status(500).send('Server error')
        })
    })
    .catch((err) => {
        console.log('error', err);
        return res.status(500).send('Server error')
    })
})

router.delete('/education/:edu_id', auth, (req, res) => {
    Profile.findOne({user: req.user.id})
    .then((profile) => {
        // Get removed index 
        const removedIndex = profile.education
        .map(item => item.id)
        .indexOf(req.params.edu_id);
        profile.education.splice(removedIndex, 1);
        profile.save();
        return profile;
    })
    .then((updatedProfile) => {
        return res.json(updatedProfile);
    })
    .catch((err) => {
        console.log('error', err);
        return res.status(500).send('Server error')
    })
})

router.get('/github/:username', (req, res) =>{
    // const options = {
    //    uri: `http://api.github.com/users/${req.params.username}
    //    /repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}
    //    &client_secret=${config.get('githubSecret')}`,
    //    method: 'GET',
    //    headers: {'User-Agent': 'himanshiGitHub'}
    // };
    // console.log('1111111111111')

    // request(options, (error,response,body) => {
    //     console.log('22222222222', response )
    //     if(error) console.log('error', error);
    //     if(response.statusCode != 200) {
    //         return res.status(404).json({msg: 'No Github profile found'});
    //     } else {
    //        return  res.json(JSON.parse(body));

    //     }

    // })

    const uri = encodeURI(
        `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
      );
      const headers = {
        'user-agent': 'himanshiGitHub',
        Authorization: `token ${config.get('githubToken')}`
      };
  
      axios.get(uri, { headers })
      .then((gitres) => {
        return res.json(gitres.data);
      })
      .catch((err) => {
        console.log('error', err);
        return res.status(500).send('Server error')
    })
      
})

module.exports = router;