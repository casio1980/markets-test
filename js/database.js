const { MongoClient } = require('mongodb');

exports.connect = url =>
  new Promise((resolve, reject) => {
    MongoClient.connect(url, { useNewUrlParser: true }, (err, client) => {
      if (err) reject(err);
      else resolve(client);
    });
  });

// function load(collection, filter) {
//     return new Promise((resolve, reject) => {
//         collection.find(filter).sort({ date: 1 }).toArray((err, docs) => {
//             if (err) reject(err);
//             else resolve(docs);
//         });
//     });
// }
// exports.load = load;
