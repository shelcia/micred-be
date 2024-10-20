import { Router } from "express";
import { getDbCollection } from "../../lib/helpers";

const router = Router();

router.get("/:email", async (req, res) => {
  // const { email } = req.body;
  try {
    const collection = await getDbCollection("user");
    // Find user by email
    const user = await collection.findOne({ email: req.params.email });
    if (user) {
      const profile = {
        firstName: user.firstName,
        primarySpeciality: user.primarySpeciality,
        licenseCertificateUrl: user.licenseCertificateUrl[0],
        licensedState: user.licensedState,
        expirationDate: user.expirationDate,
        deaNumber: user.deaNumber,
        npiNumber: user.npiNumber,
        licenseNumber: user.licenseNumber,
      };
      res.status(200).json({ message: profile });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error" });
  }
});

// router.post("/api/profile/create", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("Profiles");

//   const userProfile = {
//     id: req.body.id,
//     email: req.body.email,
//     firstName: req.body.firstName,
//     lastName: req.body.lastName,
//     phoneNumber: req.body.phoneNumber,
//     npiNumber: req.body.npiNumber,
//     specialties: req.body.specialties,
//   };

//   try {
//     const { resource } = await container.items.create(userProfile);
//     res.status(201).json(resource);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

// // Update Profile

// router.put("/api/profile/update/:id", async (req, res) => {
//   const client = new CosmosClient({
//     endpoint: process.env.COSMOS_DB_ENDPOINT,
//     key: process.env.COSMOS_DB_KEY,
//   });
//   const database = client.database("UserProfileDB");
//   const container = database.container("Profiles");

//   const { id } = req.params;
//   const updatedProfile = {
//     ...req.body,
//   };

//   try {
//     const { resource } = await container.item(id).replace(updatedProfile);
//     res.status(200).json(resource);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });

export default router;
