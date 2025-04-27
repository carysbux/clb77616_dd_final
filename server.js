// Initialize express, body parser and multer
const express = require('express')
const app = express()
const multer = require('multer')
const bodyParser = require('body-parser')
const path = require('path')
const fs = require('fs')

// define sequelize models and init database
const { Sequelize, Model, DataTypes } = require('sequelize')


const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite'
})

// define model
const Photo = sequelize.define('Photo', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    url: DataTypes.STRING,
    category: DataTypes.STRING
})


app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(express.static('public'))

// sync 
sequelize.sync()

// initialize handlebars
const handlebars = require('express-handlebars')
app.engine('handlebars', handlebars.engine())
app.set('view engine', 'handlebars')


const port = process.env.PORT || 3000

// check uploads directory 
const uploadDir = './public/uploads'
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

// code multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/uploads')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname)
    }
})

const upload = multer({ storage: storage })

// Add routes
// Home page with 3 recent photos
app.get('/', async (req, res) => {
    const categories = ['Faces', 'Places', 'Things']
    const recentPhotos = {}
    
    for (const category of categories) {
        const photos = await Photo.findAll({
            where: { category },
            order: [['createdAt', 'DESC']],
            limit: 3
        })
        recentPhotos[category] = photos
    }
    
    res.render('home', { categories, recentPhotos })
})

// Category view
app.get('/category/:category', async (req, res) => {
    const category = req.params.category
    const photos = await Photo.findAll({ 
        where: { category },
        order: [['createdAt', 'DESC']]
    })
    
    res.render('category', { category, photos })
})

// Upload form
app.get('/upload', (req, res) => {
    res.render('upload')
})

// Handle upload
app.post('/upload', upload.single('image'), async (req, res) => {
    const { title, description, category } = req.body
    
    if (!req.file) {
        return res.status(400).send('No image uploaded')
    }
    
    const photo = await Photo.create({
        title: title,
        description: description,
        url: '/uploads/' + req.file.filename,
        category: category
    })
    
    res.redirect('/')
})

// Admin page
app.get('/admin', async (req, res) => {
    const photos = await Photo.findAll({ order: [['createdAt', 'DESC']] })
    res.render('admin', { photos })
})

// Delete photo
app.get('/delete/:id', async (req, res) => {
    const photo = await Photo.findByPk(req.params.id)
    
    if (photo) {
        // Delete file from filesystem
        const filePath = path.join(__dirname, 'public', photo.url)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
        
        await photo.destroy()
    }
    
    res.redirect('/admin')
})

// Error handling
app.use((req, res) => {
    res.status(404).send('404 - Not Found')
})

app.use((error, req, res, next) => {
    console.error(error)
    res.status(500).send('Server Error')
})

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port} press ctrl + c to close`)
})