# UMass Amherst Portal for Geospatial Data
UMAP GeoData is the University of Massachusetts Amherst's [GeoBlacklight](https://geoblacklight.org) instance, managed and hosted by the University Libraries.

### Current Release Version
UMAP GeoData v1.2.x / GeoBlacklight v4.5

### Dependencies

View the full GeoBlacklight release and technology dependency matrix on [geoblacklight.org](https://geoblacklight.org/).

* [Ruby](https://www.ruby-lang.org/en/) 3.3.9
* [Rails](https://rubyonrails.org) 8.0.5.1
* [Apache Solr](https://solr.apache.org/) 9.2.1
* [Node.js](https://nodejs.org/en/) (npm)
* [MySQL](https://dev.mysql.com/downloads/mysql/) 9.7.1

## How to install and run UMAP GeoData
This is the workflow to setup a MacBook with an Apple silicon (M) chip.

### Install dependencies
[GoRails](https://gorails.com/setup) has great Ruby on Rails setup instructions for macOS, Ubuntu, and Windows. It goes through the general process to get up and running, but it doesn’t cover everything, and it may be preferable to install each dependency following separate tutorials.

1. Follow the latest [documentation](https://brew.sh/) to install **Homebrew**.

1. Install **Ruby dependencies**:

   ```
   brew install openssl@3 libyaml gmp rust
   ```

1. It's recommended to install Ruby on Rails with a version manager, like **mise**, which will handle Ruby, Java, node, and more.

    1. Run the following code to install:
        ```
        curl https://mise.run | sh
        ```
    1. Then, ensure the version manager is loaded in your shell:
        ```
        echo 'eval "$(~/.local/bin/mise activate)"' >> ~/.zshrc
        source ~/.zshrc
        ```

1. Install **Ruby** and **Bundler**, substituting the Ruby version specified above:

   ```
   mise use --global ruby@[version]
   gem update --system
   ```

1. Install **Node.js**, substituting the version you want – as of this release, the current version is 24.18.0. This should also install the package manager **npm**:

   ```
   mise use --global node@[version]
   node -v
   ```

1. Install **Rails**, substituting the Rails version specified above:

   ```
   gem install rails -v [version]
   ```
   
1. Install **java**:
   1. First, check what version of openjdk is supported by the version of solr called in [solr_wrapper.yml](https://github.com/umass-gis/geoblacklight/blob/main/.solr_wrapper.yml).
   1. Use homebrew to install, adding the version
       ```
       brew install openjdk@[version]
       ```
   1. Establish a symlink:
      ```
      sudo ln -sfn /opt/homebrew/opt/openjdk@[version]/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-[version].jdk
      ```
   1. If you have multiple versions of openjdk installed, you will need to set the default version in the .zshrc file. Open the file with `nano .zshrc` then add the following to the bottom of the file:
      ```
      export JAVA_HOME=`/usr/libexec/java_home -v [version]`
      ```
      Save the file with `ctrl + o` and close with `ctrl + x`.


### Set up the relational database
UMass is using **MySQL**, although PostgreSQL is the recommended RDBMS starting with GeoBlacklight v5.

1. Install **MySQL**:
   ```
   brew install mysql
   ```
1. Start the database:
   ```
   brew services start mysql
   ```
1. Optionally, secure the database:
   ```
   mysql_secure_installation
   ```

1. If you create a password, add it to the local file .env.development.  


### Configure GeoBlacklight

1. Clone the project:

    ```
    cd <your project directory>
    git clone git@github.com:/umass-gis/geoblacklight.git
    ```

1. Duplicate the .example files in the project and remove the .example string from each of their filename:
    
    ```
    cp .example.env.development .env.development  
    cp .example.env.test .env.test
    ```
    Then, update the MYSQL_USER and MYSQL_PASSWORD credentials in these files. These variables are called by `database.yml` when establishing a connection to the database.

1. Navigate to the project directory and install the **ruby gems**:
   ```
   bundle install
   ```

1. Create and migrate the databases:

    Development environment:
    ```
    bundle exec rails db:create
    bundle exec rails db:migrate
    ```
    Test environment:
    ```
    RAILS_ENV=test bundle exec rails db:create
    RAILS_ENV=test bundle exec rails db:migrate
    ```

### Run the Application

The rake task below will spin up Solr, index the test fixture documents, and start the default Rails web server.

```
bundle exec rake umass:server
```

* View the application at [http://localhost:3000](http://localhost:3000)
* View the Solr admin panel at [http://localhost:8983](http://localhost:8983)

### Docker Quickstart

The repository includes a production-style Docker Compose stack with Caddy, Puma,
MySQL, and Solr. Install Docker Engine with the Compose plugin, then make sure
your user can access the Docker daemon:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

Copy the production environment template and replace the placeholder secrets in
`.env.production`:

```bash
cp .example.env.production .env.production
```

For a local-only run, set `DOMAIN=localhost` in `.env.production`. To access the
application from another machine, set `DOMAIN` to the server hostname instead,
such as `DOMAIN=afs-979949-vm5`. The hostname must resolve to this server from
the client machine, using DNS or an `/etc/hosts` entry, and TCP port 443 must be
allowed through the firewall.

Create a self-signed certificate whose name matches `DOMAIN` (replace the
hostname below if needed):

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 365 \
   -keyout certs/geodata.key \
   -out certs/geodata.crt \
   -subj "/CN=afs-979949-vm5" \
   -addext "subjectAltName=DNS:afs-979949-vm5"
```

Build and start the stack:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Open `https://localhost` for a local run, or `https://afs-979949-vm5/` when using
the server hostname. A browser warning is expected for a self-signed certificate;
use a certificate from a trusted CA for production.

The app waits for MySQL and Solr, runs `db:prepare`, and then starts Puma. Compose
uses `.env.production` for MySQL, the app, and Caddy; its container environment
overrides the local `127.0.0.1` database and Solr addresses with service names.
Caddy proxies HTTPS traffic to the private app container. For production, set
`DOMAIN` in `.env.production` to the public hostname and provide the institutional
certificate and key under `certs/`. For Let's Encrypt, remove the `tls` directive
from `Caddyfile` and the certificate mount from `docker-compose.yml`.

To load the sample UMass records or clear the index:

```bash
docker compose exec app bundle exec rake umass:index:umass
docker compose exec app bundle exec rake umass:index:delete_all
```

### Docker Development and Testing

Development and test use a separate image with the development and test gems,
bind-mounted source code, and Vite running in watch mode. They do not use Caddy
or the production TLS setup.

Start the development stack:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Open [http://localhost:3000](http://localhost:3000). For development from
another machine, set `VITE_RUBY_HOST` to the server hostname before starting the
stack and allow ports 3000 and 3036 through the firewall:

```bash
VITE_RUBY_HOST=afs-979949-vm5 docker compose -f docker-compose.dev.yml up --build
```

Run the test suite using the same Docker image and isolated test database:

```bash
docker compose -f docker-compose.dev.yml run --rm \
   -e RAILS_ENV=test app \
   sh -lc 'gem install bundler -v 2.7.1 --no-document && bundle _2.7.1_ exec rails db:prepare && bundle _2.7.1_ exec rake ci'
```

Stop the development services when finished:

```bash
docker compose -f docker-compose.dev.yml down
```

### Run the Test Suite

Stop any instances of GeoBlacklight before running this command.

```
RAILS_ENV=test bundle exec rake ci
```

### Run the Rake Tasks for Solr

Delete all data from the Solr index

```bash
bundle exec rake umass:index:delete_all
```

Index just the UMass test fixtures

```bash
bundle exec rake rake umass:index:umass
```
