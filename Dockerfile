# Step 1: Pulls a simple ubuntu image with node 8 installed in it
FROM node:8

# Step 2: Make a new directory called "src"
RUN mkdir /app

# Step 3: Copy the package.json file from your local directory and paste it inside the container, inside the src directory
COPY app/package.json /app/package.json

# Step 4: cd into the src directory and run npm install to install application dependencies
RUN cd /app && npm install

# Step 5: Add all source code into the src directory from your local src directory
ADD app /app
RUN cd /app && npm run build

# Step 6: Set src as our current work directory
WORKDIR /app

EXPOSE 8080

# Step 7: Run node server.js inside the src directory
CMD ["npm", "start"]
